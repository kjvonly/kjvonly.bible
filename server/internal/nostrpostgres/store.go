// Package nostrpostgres provides a PostgreSQL eventstore for the current Khatru API.
// Relay and Blossom use separate databases but share this implementation.
package nostrpostgres

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"iter"
	"log"
	"math"
	"strings"
	"time"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/eventstore"
	"github.com/lib/pq"
)

// Store implements the current eventstore.Store contract, without a legacy
// event representation. All instances coordinate replaceable writes using
// PostgreSQL advisory locks scoped to a transaction.
type Store struct {
	db *sql.DB
}

var _ eventstore.Store = (*Store)(nil)

func New(databaseURL string) (*Store, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		// lib/pq only parses the DSN once a connection is opened; opening a
		// sql.DB itself is not a network operation.
		return nil, fmt.Errorf("configure PostgreSQL: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Init() error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS nostr_events (
			id BYTEA PRIMARY KEY,
			pubkey BYTEA NOT NULL,
			kind INTEGER NOT NULL,
			created_at BIGINT NOT NULL,
			d_tag TEXT NOT NULL DEFAULT '',
			content TEXT NOT NULL,
			event_json JSONB NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS nostr_events_recent ON nostr_events (created_at DESC, id DESC)`,
		`CREATE INDEX IF NOT EXISTS nostr_events_pubkey_kind ON nostr_events (pubkey, kind, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS nostr_events_address ON nostr_events (pubkey, kind, d_tag)`,
		`CREATE TABLE IF NOT EXISTS nostr_event_tags (
			event_id BYTEA NOT NULL REFERENCES nostr_events(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			value TEXT NOT NULL,
			PRIMARY KEY (event_id, name, value)
		)`,
		`CREATE INDEX IF NOT EXISTS nostr_event_tags_lookup ON nostr_event_tags (name, value, event_id)`,
	} {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("initialize PostgreSQL eventstore: %w", err)
		}
	}
	return nil
}

func (s *Store) Close() {
	if err := s.db.Close(); err != nil {
		log.Printf("[postgres] close: %v", err)
	}
}

func (s *Store) SaveEvent(evt nostr.Event) error {
	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := insertEvent(ctx, tx, evt); err != nil {
		return err
	}
	return tx.Commit()
}

func insertEvent(ctx context.Context, tx *sql.Tx, evt nostr.Event) error {
	data, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("encode event: %w", err)
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO nostr_events
		(id, pubkey, kind, created_at, d_tag, content, event_json)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		evt.ID[:], evt.PubKey[:], int(evt.Kind), int64(evt.CreatedAt), eventAddress(evt), evt.Content, string(data))
	if isDuplicate(err) {
		return eventstore.ErrDupEvent
	}
	if err != nil {
		return err
	}
	for _, tag := range evt.Tags {
		if len(tag) < 2 || len(tag[0]) != 1 {
			continue
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO nostr_event_tags (event_id, name, value)
			VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, evt.ID[:], tag[0], tag[1])
		if err != nil {
			return err
		}
	}
	return nil
}

func eventAddress(evt nostr.Event) string {
	if evt.Kind.IsAddressable() {
		return evt.Tags.GetD()
	}
	return ""
}

func isDuplicate(err error) bool {
	var pgerr *pq.Error
	return errors.As(err, &pgerr) && pgerr.Code == "23505"
}

func (s *Store) DeleteEvent(id nostr.ID) error {
	_, err := s.db.Exec(`DELETE FROM nostr_events WHERE id = $1`, id[:])
	return err
}

// ReplaceEvent serializes writes for the same address across relay processes,
// rejecting stale events and returning removed records to Khatru. For events
// with identical timestamps, the lexicographically lowest ID wins (NIP-01).
func (s *Store) ReplaceEvent(evt nostr.Event) ([]nostr.Event, error) {
	if !evt.Kind.IsReplaceable() && !evt.Kind.IsAddressable() {
		return nil, s.SaveEvent(evt)
	}
	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	address := eventAddress(evt)
	// A transaction-scoped advisory lock closes the "no existing row" race.
	lockKey := replacementLockKey(evt.PubKey, evt.Kind, address)
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock($1)`, lockKey); err != nil {
		return nil, err
	}

	rows, err := tx.QueryContext(ctx, `SELECT event_json FROM nostr_events
		WHERE pubkey = $1 AND kind = $2 AND d_tag = $3 FOR UPDATE`, evt.PubKey[:], int(evt.Kind), address)
	if err != nil {
		return nil, err
	}
	var deleted []nostr.Event
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			rows.Close()
			return nil, err
		}
		var old nostr.Event
		if err := json.Unmarshal(data, &old); err != nil {
			rows.Close()
			return nil, err
		}
		if old.CreatedAt > evt.CreatedAt || (old.CreatedAt == evt.CreatedAt && strings.Compare(old.ID.Hex(), evt.ID.Hex()) <= 0) {
			rows.Close()
			return nil, eventstore.ErrDupEvent
		}
		deleted = append(deleted, old)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM nostr_events
		WHERE pubkey = $1 AND kind = $2 AND d_tag = $3`, evt.PubKey[:], int(evt.Kind), address); err != nil {
		return nil, err
	}
	if err := insertEvent(ctx, tx, evt); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return deleted, nil
}

func replacementLockKey(pubkey nostr.PubKey, kind nostr.Kind, address string) int64 {
	input := make([]byte, 36, 36+len(address))
	copy(input, pubkey[:])
	binary.BigEndian.PutUint32(input[32:], uint32(kind))
	input = append(input, address...)
	hash := sha256.Sum256(input)
	return int64(binary.BigEndian.Uint64(hash[:8]))
}

// filterSQL uses indexed predicates for NIP-01 IDs, authors, kinds, tag
// selectors, and timestamp bounds. Search is a literal substring search.
// The caller adds ORDER BY/LIMIT for queries and COUNT(*) for counts.
func filterSQL(filter nostr.Filter) (string, []any) {
	clauses := []string{"TRUE"}
	args := make([]any, 0, 5+len(filter.Tags)*2)
	add := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}
	if len(filter.IDs) > 0 {
		ids := make(pq.ByteaArray, len(filter.IDs))
		for i, id := range filter.IDs {
			ids[i] = id[:]
		}
		clauses = append(clauses, "e.id = ANY("+add(ids)+")")
	}
	if len(filter.Authors) > 0 {
		authors := make(pq.ByteaArray, len(filter.Authors))
		for i, author := range filter.Authors {
			authors[i] = author[:]
		}
		clauses = append(clauses, "e.pubkey = ANY("+add(authors)+")")
	}
	if len(filter.Kinds) > 0 {
		kinds := make([]int64, len(filter.Kinds))
		for i, kind := range filter.Kinds {
			kinds[i] = int64(kind)
		}
		clauses = append(clauses, "e.kind = ANY("+add(pq.Array(kinds))+")")
	}
	if filter.Since != 0 {
		clauses = append(clauses, "e.created_at >= "+add(int64(filter.Since)))
	}
	if filter.Until != 0 {
		clauses = append(clauses, "e.created_at <= "+add(int64(filter.Until)))
	}
	for name, values := range filter.Tags {
		// An empty value list cannot match any event.
		if len(values) == 0 {
			clauses = append(clauses, "FALSE")
			continue
		}
		nameParam := add(name)
		valuesParam := add(pq.Array(values))
		clauses = append(clauses, fmt.Sprintf(`EXISTS (SELECT 1 FROM nostr_event_tags t
			WHERE t.event_id = e.id AND t.name = %s AND t.value = ANY(%s))`, nameParam, valuesParam))
	}
	if filter.Search != "" {
		clauses = append(clauses, "strpos(lower(e.content), lower("+add(filter.Search)+")) > 0")
	}
	return strings.Join(clauses, " AND "), args
}

func queryLimit(filter nostr.Filter, maxLimit int) int {
	if filter.LimitZero {
		return 0
	}
	if maxLimit <= 0 {
		maxLimit = 500
	}
	if filter.Limit > 0 && filter.Limit < maxLimit {
		return filter.Limit
	}
	return maxLimit
}

func (s *Store) QueryEvents(filter nostr.Filter, maxLimit int) iter.Seq[nostr.Event] {
	return func(yield func(nostr.Event) bool) {
		limit := queryLimit(filter, maxLimit)
		if limit == 0 {
			return
		}
		where, args := filterSQL(filter)
		args = append(args, limit)
		query := fmt.Sprintf(`SELECT e.event_json FROM nostr_events e
			WHERE %s ORDER BY e.created_at DESC, e.id DESC LIMIT $%d`, where, len(args))
		rows, err := s.db.Query(query, args...)
		if err != nil {
			log.Printf("[postgres] query: %v", err)
			return
		}
		defer rows.Close()
		for rows.Next() {
			var data []byte
			if err := rows.Scan(&data); err != nil {
				log.Printf("[postgres] scan: %v", err)
				return
			}
			var evt nostr.Event
			if err := json.Unmarshal(data, &evt); err != nil {
				log.Printf("[postgres] decode event: %v", err)
				return
			}
			if !yield(evt) {
				return
			}
		}
		if err := rows.Err(); err != nil {
			log.Printf("[postgres] iterate: %v", err)
		}
	}
}

func (s *Store) CountEvents(filter nostr.Filter) (uint32, error) {
	where, args := filterSQL(filter)
	var count int64
	err := s.db.QueryRow("SELECT count(*) FROM nostr_events e WHERE "+where, args...).Scan(&count)
	if err != nil {
		return 0, err
	}
	if count > math.MaxUint32 {
		return math.MaxUint32, nil
	}
	return uint32(count), nil
}
