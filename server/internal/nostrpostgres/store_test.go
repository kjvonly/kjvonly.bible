package nostrpostgres

import (
	"crypto/rand"
	"errors"
	"os"
	"strings"
	"testing"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/eventstore"
)

func TestFilterSQL(t *testing.T) {
	filter := nostr.Filter{
		IDs:     []nostr.ID{nostr.MustIDFromHex(strings.Repeat("a", 64))},
		Authors: []nostr.PubKey{nostr.MustPubKeyFromHex(strings.Repeat("b", 64))},
		Kinds:   []nostr.Kind{37770},
		Tags:    nostr.TagMap{"d": {"kjvs/1_1"}, "p": {"someone"}},
		Since:   10,
		Until:   20,
		Search:  "foo%bar",
	}
	where, args := filterSQL(filter)
	for _, clause := range []string{
		"e.id = ANY($1)", "e.pubkey = ANY($2)", "e.kind = ANY($3)",
		"e.created_at >= $4", "e.created_at <= $5", "EXISTS", "strpos(lower(e.content), lower(",
	} {
		if !strings.Contains(where, clause) {
			t.Fatalf("missing %q in %s", clause, where)
		}
	}
	if len(args) != 10 {
		t.Fatalf("expected 10 parameters, got %d", len(args))
	}
}

func TestQueryLimits(t *testing.T) {
	for _, test := range []struct {
		filter nostr.Filter
		max    int
		want   int
	}{
		{nostr.Filter{}, 500, 500},
		{nostr.Filter{Limit: 100}, 500, 100},
		{nostr.Filter{Limit: 800}, 500, 500},
		{nostr.Filter{LimitZero: true}, 500, 0},
	} {
		if got := queryLimit(test.filter, test.max); got != test.want {
			t.Fatalf("queryLimit(%+v, %d) = %d, want %d", test.filter, test.max, got, test.want)
		}
	}
}

func TestReplacementLockIdentity(t *testing.T) {
	pubkey := nostr.MustPubKeyFromHex(strings.Repeat("b", 64))
	if replacementLockKey(pubkey, 30000, "a") == replacementLockKey(pubkey, 30000, "b") {
		t.Fatal("different d tags must not share a replacement lock")
	}
	if replacementLockKey(pubkey, 30000, "a") != replacementLockKey(pubkey, 30000, "a") {
		t.Fatal("identical address must share a replacement lock")
	}
}

// Set TEST_POSTGRES_URL to a dedicated disposable database to exercise the
// complete storage contract, including transactional replacement and tag queries.
func TestPostgresIntegration(t *testing.T) {
	url := os.Getenv("TEST_POSTGRES_URL")
	if url == "" {
		t.Skip("TEST_POSTGRES_URL not set")
	}
	store, err := New(url)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Init(); err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	var pubkey nostr.PubKey
	var firstID, secondID nostr.ID
	for _, destination := range [][]byte{pubkey[:], firstID[:], secondID[:]} {
		if _, err := rand.Read(destination); err != nil {
			t.Fatal(err)
		}
	}
	first := nostr.Event{ID: firstID, PubKey: pubkey, Kind: 30001,
		CreatedAt: 10, Tags: nostr.Tags{{"d", "integration"}, {"p", "friend"}}, Content: "first"}
	second := first
	second.ID = secondID
	second.CreatedAt = 11
	second.Content = "second"
	defer store.DeleteEvent(first.ID)
	defer store.DeleteEvent(second.ID)

	if _, err := store.ReplaceEvent(first); err != nil {
		t.Fatal(err)
	}
	if _, err := store.ReplaceEvent(first); !errors.Is(err, eventstore.ErrDupEvent) {
		t.Fatalf("expected duplicate on same event, got %v", err)
	}
	deleted, err := store.ReplaceEvent(second)
	if err != nil || len(deleted) != 1 || deleted[0].ID != first.ID {
		t.Fatalf("replacement deleted=%+v err=%v", deleted, err)
	}
	if _, err := store.ReplaceEvent(first); !errors.Is(err, eventstore.ErrDupEvent) {
		t.Fatalf("stale replacement should be rejected, got %v", err)
	}
	filter := nostr.Filter{Kinds: []nostr.Kind{30001}, Authors: []nostr.PubKey{pubkey},
		Tags: nostr.TagMap{"d": {"integration"}, "p": {"friend"}}}
	var found []nostr.Event
	for evt := range store.QueryEvents(filter, 500) {
		found = append(found, evt)
	}
	if len(found) != 1 || found[0].ID != second.ID {
		t.Fatalf("unexpected query results: %+v", found)
	}
	count, err := store.CountEvents(filter)
	if err != nil || count != 1 {
		t.Fatalf("count=%d err=%v", count, err)
	}
	if err := store.DeleteEvent(second.ID); err != nil {
		t.Fatal(err)
	}
	if count, _ := store.CountEvents(filter); count != 0 {
		t.Fatalf("event not deleted: %d", count)
	}

	// Plain event insertion uses the same PostgreSQL implementation as the
	// replaceable path and must report duplicate IDs consistently.
	var regularID nostr.ID
	if _, err := rand.Read(regularID[:]); err != nil {
		t.Fatal(err)
	}
	regular := nostr.Event{ID: regularID, PubKey: pubkey, Kind: 1,
		CreatedAt: 12, Tags: nostr.Tags{{"t", "integration"}}, Content: "ordinary"}
	defer store.DeleteEvent(regular.ID)
	if err := store.SaveEvent(regular); err != nil {
		t.Fatal(err)
	}
	if err := store.SaveEvent(regular); !errors.Is(err, eventstore.ErrDupEvent) {
		t.Fatalf("expected duplicate ID, got %v", err)
	}
	regularFilter := nostr.Filter{Kinds: []nostr.Kind{1}, Authors: []nostr.PubKey{pubkey},
		Tags: nostr.TagMap{"t": {"integration"}}}
	if count, err := store.CountEvents(regularFilter); err != nil || count != 1 {
		t.Fatalf("regular event count=%d err=%v", count, err)
	}
	for range store.QueryEvents(nostr.Filter{LimitZero: true}, 500) {
		t.Fatal("limit:0 returned events")
	}
}
