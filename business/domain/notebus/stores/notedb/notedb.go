// Package notedb contains note related CRUD functionality.
package notedb

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/business/sdk/sqldb"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
)

// Store manages the set of APIs for note database access.
type Store struct {
	log *logger.Logger
	db  sqlx.ExtContext
}

// NewStore constructs the api for data access.
func NewStore(log *logger.Logger, db *sqlx.DB) *Store {
	return &Store{
		log: log,
		db:  db,
	}
}

// NewWithTx constructs a new Store value replacing the sqlx DB
// value with a sqlx DB value that is currently inside a transaction.
func (s *Store) NewWithTx(tx sqldb.CommitRollbacker) (notebus.Storer, error) {
	ec, err := sqldb.GetExtContext(tx)
	if err != nil {
		return nil, err
	}

	store := Store{
		log: s.log,
		db:  ec,
	}

	return &store, nil
}

// Create inserts a new note into the database.
func (s *Store) Create(ctx context.Context, nte notebus.Note) error {
	const q = `
    INSERT INTO notes
        (
            note_id,
            user_id,
			offline_id,
            type,
            bcv,
            chapter_key,
            html,
            text,
            title,
            tags,
            date_created,
            date_updated
		)
    VALUES
        (
            :note_id,
            :user_id,
			:offline_id,
            :type,
            :bcv,
            :chapter_key,
            :html,
            :text,
            :title,
            :tags,
            :date_created,
            :date_updated
		)`

	dbNte, err := toDBNote(nte)
	if err != nil {
		return fmt.Errorf("toDBNote: %w", err)
	}
	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, dbNte); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Delete removes a note from the database.
func (s *Store) Delete(ctx context.Context, nte notebus.Note) error {
	data := struct {
		ID string `db:"note_id"`
	}{
		ID: nte.ID.String(),
	}

	const q = `
    DELETE FROM
	    notes
	WHERE
	  	note_id = :note_id`

	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, data); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Update replaces a note document in the database.
func (s *Store) Update(ctx context.Context, nte notebus.Note) error {
	const q = `
    UPDATE
        notes
    SET
        "type"          =   :type,
        "bcv"           =   :bcv,
        "chapter_key"   =   :chapter_key,
        "html"          =   :html,
        "text"          =   :text,
        "title"         =   :title,
        "tags"          =   :tags,
        "date_updated"  =   :date_updated
    WHERE
        note_id = :note_id`

	dbNte, err := toDBNote(nte)
	if err != nil {
		return fmt.Errorf("toDBNote: %w", err)
	}
	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, dbNte); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Query retrieves a list of existing notes from the database.
func (s *Store) Query(ctx context.Context, filter notebus.QueryFilter, orderBy order.By, page page.Page) ([]notebus.Note, error) {
	data := map[string]any{
		"offset":        (page.Number() - 1) * page.RowsPerPage(),
		"rows_per_page": page.RowsPerPage(),
	}

	const q = `
    SELECT
        note_id,
        user_id,
        type,
        bcv,
        chapter_key,
        html,
        text,
        title,
        tags,
        date_created,
        date_updated
	FROM
	  	notes`

	buf := bytes.NewBufferString(q)
	s.applyFilter(filter, data, buf)

	orderByClause, err := orderByClause(orderBy)
	if err != nil {
		return nil, err
	}

	buf.WriteString(orderByClause)
	buf.WriteString(" OFFSET :offset ROWS FETCH NEXT :rows_per_page ROWS ONLY")

	var dbNtes []note
	if err := sqldb.NamedQuerySlice(ctx, s.log, s.db, buf.String(), data, &dbNtes); err != nil {
		return nil, fmt.Errorf("namedqueryslice: %w", err)
	}

	ntes, err := toBusNotes(dbNtes)
	if err != nil {
		return nil, err
	}

	return ntes, nil
}

// Count returns the total number of notes in the DB.
func (s *Store) Count(ctx context.Context, filter notebus.QueryFilter) (int, error) {
	data := map[string]any{}

	const q = `
    SELECT
        count(1)
    FROM
        notes`

	buf := bytes.NewBufferString(q)
	s.applyFilter(filter, data, buf)

	var count struct {
		Count int `db:"count"`
	}
	if err := sqldb.NamedQueryStruct(ctx, s.log, s.db, buf.String(), data, &count); err != nil {
		return 0, fmt.Errorf("db: %w", err)
	}

	return count.Count, nil
}

// QueryByID gets the specified note from the database.
func (s *Store) QueryByID(ctx context.Context, noteID uuid.UUID) (notebus.Note, error) {
	data := struct {
		ID string `db:"note_id"`
	}{
		ID: noteID.String(),
	}

	const q = `
    SELECT
        note_id,
        user_id,
        type,
        bcv,
        chapter_key,
        html,
        text,
        title,
        tags,
        date_created,
        date_updated
    FROM
        notes
    WHERE
        note_id = :note_id`

	var dbNte note
	if err := sqldb.NamedQueryStruct(ctx, s.log, s.db, q, data, &dbNte); err != nil {
		if errors.Is(err, sqldb.ErrDBNotFound) {
			return notebus.Note{}, fmt.Errorf("db: %w", notebus.ErrNotFound)
		}
		return notebus.Note{}, fmt.Errorf("db: %w", err)
	}

	return toBusNote(dbNte)
}

// QueryByUserID gets the specified note from the database by user id.
func (s *Store) QueryByUserID(ctx context.Context, userID uuid.UUID) ([]notebus.Note, error) {
	data := struct {
		ID string `db:"user_id"`
	}{
		ID: userID.String(),
	}

	const q = `
	SELECT
        note_id,
        user_id,
        type,
        bcv,
        chapter_key,
        html,
        text,
        title,
        tags,
        date_created,
        date_updated
	FROM
		notes
	WHERE
		user_id = :user_id`

	var dbNtes []note
	if err := sqldb.NamedQuerySlice(ctx, s.log, s.db, q, data, &dbNtes); err != nil {
		return nil, fmt.Errorf("db: %w", err)
	}

	return toBusNotes(dbNtes)
}
