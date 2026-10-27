package main

import (
	"context"
	"fmt"
	"iter"
	"log"
	"net/http"
	"os"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/khatru"
	"fiatjaf.com/nostr/khatru/policies"
	"kjvonly.bible/server/internal/nostrpostgres"
)

func main() {
	relay := khatru.NewRelay()

	relay.Negentropy = true
	relay.Info.SupportedNIPs = append(relay.Info.SupportedNIPs, 77)
	relay.Info.Name = "my relay"
	owner := nostr.MustPubKeyFromHex("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798")
	relay.Info.PubKey = &owner
	relay.Info.Description = "this is my custom relay"
	relay.Info.Icon = "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fliquipedia.net%2Fcommons%2Fimages%2F3%2F35%2FSCProbe.jpg&f=1&nofb=1&ipt=0cbbfef25bce41da63d910e86c3c343e6c3b9d63194ca9755351bb7c2efa3359&ipo=images"

	store, err := nostrpostgres.New(env("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/postgres?sslmode=disable"))
	if err != nil {
		log.Fatal(err)
	}
	if err := store.Init(); err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	relay.UseEventstore(store, 500)

	queryStored := relay.QueryStored
	relay.QueryStored = func(ctx context.Context, filter nostr.Filter) iter.Seq[nostr.Event] {
		log.Printf("[relay] query start filter=%+v", filter)
		return func(yield func(nostr.Event) bool) {
			count := 0
			for event := range queryStored(ctx, filter) {
				count++
				log.Printf("[relay] query event kind=%d pubkey=%s d=%s id=%s", event.Kind, event.PubKey.Hex(), event.Tags.GetD(), event.ID.Hex())
				if !yield(event) {
					break
				}
			}
			log.Printf("[relay] query done count=%d filter=%+v", count, filter)
		}
	}

	blockedPubkey := nostr.MustPubKeyFromHex("fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52")
	relay.OnEvent = policies.SeqEvent(
		policies.ValidateKind,
		preventLargeTagValues(512),
		func(ctx context.Context, event nostr.Event) (bool, string) {
			if event.PubKey == blockedPubkey {
				return true, "we don't allow this person to write here"
			}
			return false, ""
		},
	)

	relay.OnRequest = policies.SeqRequest(
		policies.NoComplexFilters,
		func(ctx context.Context, filter nostr.Filter) (bool, string) {
			pubkey, authenticated := khatru.GetAuthed(ctx)
			pubkeyHex := ""
			if authenticated {
				pubkeyHex = pubkey.Hex()
			}

			log.Printf("[relay] incoming REQ filter=%+v authed=%t pubkey=%s", filter, authenticated, pubkeyHex)
			if authenticated {
				log.Printf("[relay] accepted REQ from pubkey=%s", pubkeyHex)
				return false, ""
			}
			log.Printf("[relay] rejected REQ: auth required filter=%+v", filter)
			return true, "auth-required: only authenticated users can read from this relay"
		},
	)

	relay.OnConnect = func(ctx context.Context) {
		log.Printf("[relay] client connected")
		khatru.RequestAuth(ctx)
	}
	relay.OnDisconnect = func(ctx context.Context) {
		pubkey, authenticated := khatru.GetAuthed(ctx)
		if authenticated {
			log.Printf("[relay] client disconnected pubkey=%s", pubkey.Hex())
		} else {
			log.Printf("[relay] client disconnected pubkey=")
		}
	}

	mux := relay.Router()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "text/html")
		fmt.Fprintf(w, `<b>welcome</b> to my relay!`)
	})

	fmt.Println("running on :3334")
	if err := http.ListenAndServe(":3334", relay); err != nil {
		fmt.Println(err)
	}
}

// preventLargeTagValues preserves the older Khatru PreventLargeTags behavior:
// only indexable (single-character-name) tag values are restricted.
func preventLargeTagValues(maxTagValueLen int) func(context.Context, nostr.Event) (bool, string) {
	return func(_ context.Context, event nostr.Event) (bool, string) {
		for _, tag := range event.Tags {
			if len(tag) >= 2 && len(tag[0]) == 1 && len(tag[1]) > maxTagValueLen {
				return true, "invalid: tag value too large"
			}
		}
		return false, ""
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
