package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/fiatjaf/eventstore/postgresql"
	"github.com/fiatjaf/khatru"
	"github.com/fiatjaf/khatru/blossom"
	"github.com/fiatjaf/khatru/policies"
	minio "github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/nbd-wtf/go-nostr"
)

func main() {
	relay := khatru.NewRelay()

	db := postgresql.PostgresBackend{DatabaseURL: "postgresql://postgres:postgres@localhost:5432/blossom?sslmode=disable"}

	if err := db.Init(); err != nil {
		panic(err)
	}

	relay.StoreEvent = append(relay.StoreEvent, db.SaveEvent)
	relay.QueryEvents = append(relay.QueryEvents, db.QueryEvents)
	relay.CountEvents = append(relay.CountEvents, db.CountEvents)
	relay.DeleteEvent = append(relay.DeleteEvent, db.DeleteEvent)
	relay.ReplaceEvent = append(relay.ReplaceEvent, db.ReplaceEvent)

	// you must bring your own storage scheme -- if you want to have any

	// there are many other configurable things you can set
	relay.RejectEvent = append(relay.RejectEvent,
		// built-in policies
		policies.ValidateKind,

		// define your own policies
		policies.PreventLargeTags(100),
		func(ctx context.Context, event *nostr.Event) (reject bool, msg string) {
			if event.PubKey == "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52" {
				return true, "we don't allow this person to write here"
			}
			return false, "" // anyone else can
		},
	)

	// you can request auth by rejecting an event or a request with the prefix "auth-required: "
	relay.RejectFilter = append(relay.RejectFilter,
		// built-in policies
		policies.NoComplexFilters,

		// define your own policies
		func(ctx context.Context, filter nostr.Filter) (reject bool, msg string) {
			if pubkey := khatru.GetAuthed(ctx); pubkey != "" {
				log.Printf("request from %s\n", pubkey)
				return false, ""
			}
			return true, "auth-required: only authenticated users can read from this relay"
			// (this will cause an AUTH message to be sent and then a CLOSED message such that clients can
			//  authenticate and then request again)
		},
	)

	// inialize MinIO client
	client, err := minio.New("localhost:9000", &minio.Options{
		Creds:  credentials.NewStaticV4("minioadmin", "minioadmin", ""),
		Secure: false, // Set to true if using HTTPS
	})
	if err != nil {
		panic(err)
	}
	bucketName := "kjvonly"

	bl := blossom.New(relay, "http://localhost:3335")
	bl.Store = blossom.EventStoreBlobIndexWrapper{Store: &db, ServiceURL: bl.ServiceURL}

	// StoreBlob uploads the blob to MinIO
	bl.StoreBlob = append(bl.StoreBlob, func(ctx context.Context, sha256 string, ext string, body []byte) error {
		_, err := client.PutObject(ctx, bucketName, sha256, bytes.NewReader(body), int64(len(body)), minio.PutObjectOptions{})
		return err
	})

	// LoadBlob retrieves the blob from MinIO
	bl.LoadBlob = append(bl.LoadBlob, func(ctx context.Context, sha256 string, ext string) (io.ReadSeeker, error) {
		obj, err := client.GetObject(ctx, bucketName, sha256, minio.GetObjectOptions{})
		if err != nil {
			return nil, err
		}
		data, _ := io.ReadAll(obj)
		obj.Close()
		return bytes.NewReader(data), nil
	})

	// DeleteBlob removes the blob from MinIO
	bl.DeleteBlob = append(bl.DeleteBlob, func(ctx context.Context, sha256 string, ext string) error {
		return client.RemoveObject(ctx, bucketName, sha256, minio.RemoveObjectOptions{})
	})

	fmt.Println("running on :3335")
	http.ListenAndServe(":3335", relay)
}
