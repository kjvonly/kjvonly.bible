package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/fiatjaf/eventstore/postgresql"
	"github.com/fiatjaf/khatru"
	"github.com/fiatjaf/khatru/blossom"
	"github.com/fiatjaf/khatru/policies"
	"github.com/nbd-wtf/go-nostr"
)

func main() {

	//////////////////////////////////////////////////////////////////////////
	// RELAY

	databaseURL := env("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/blossom?sslmode=disable")

	relay := khatru.NewRelay()

	db := postgresql.PostgresBackend{DatabaseURL: databaseURL}

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

	//////////////////////////////////////////////////////////////////////////
	// S3 OBJECT STORAGE

	s3Endpoint := env("S3_ENDPOINT", "http://seaweedfs:8333")
	s3Region := env("S3_REGION", "us-east-1")
	s3AccessKey := env("S3_ACCESS_KEY", "admin")
	s3SecretKey := env("S3_SECRET_KEY", "secret")
	bucketName := env("S3_BUCKET", "kjvonly")

	awsConfig, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(s3Region),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(s3AccessKey, s3SecretKey, ""),
		),
	)
	if err != nil {
		log.Fatal(err)
	}

	s3Client := s3.NewFromConfig(awsConfig, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(s3Endpoint)
		options.UsePathStyle = true
	})

	bl := blossom.New(relay, "http://localhost:3335")
	bl.Store = blossom.EventStoreBlobIndexWrapper{Store: &db, ServiceURL: bl.ServiceURL}

	// StoreBlob uploads the blob to S3-compatible object storage.
	bl.StoreBlob = append(bl.StoreBlob, func(ctx context.Context, sha256 string, ext string, body []byte) error {
		_, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:        aws.String(bucketName),
			Key:           aws.String(sha256),
			Body:          bytes.NewReader(body),
			ContentLength: aws.Int64(int64(len(body))),
		})
		return err
	})

	// LoadBlob retrieves the blob from S3-compatible object storage.
	bl.LoadBlob = append(bl.LoadBlob, func(ctx context.Context, sha256 string, ext string) (io.ReadSeeker, error) {
		output, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(sha256),
		})
		if err != nil {
			return nil, err
		}

		data, readErr := io.ReadAll(output.Body)
		closeErr := output.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		if closeErr != nil {
			return nil, closeErr
		}

		return bytes.NewReader(data), nil
	})

	// DeleteBlob removes the blob from S3-compatible object storage.
	bl.DeleteBlob = append(bl.DeleteBlob, func(ctx context.Context, sha256 string, ext string) error {
		_, err := s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(sha256),
		})
		return err
	})

	fmt.Println("running on :3335")
	http.ListenAndServe(":3335", relay)
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
