package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"

	"fiatjaf.com/nostr"
	"fiatjaf.com/nostr/khatru"
	"fiatjaf.com/nostr/khatru/blossom"
	"fiatjaf.com/nostr/khatru/policies"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"kjvonly.bible/server/internal/nostrpostgres"
)

func main() {
	//////////////////////////////////////////////////////////////////////////
	// RELAY: retain the separate PostgreSQL database and authenticated reads.

	store, err := nostrpostgres.New(env("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/blossom?sslmode=disable"))
	if err != nil {
		log.Fatal(err)
	}
	if err := store.Init(); err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	relay := khatru.NewRelay()
	relay.UseEventstore(store, 500)

	blockedPubkey := nostr.MustPubKeyFromHex("fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52")
	relay.OnEvent = policies.SeqEvent(
		policies.ValidateKind,
		preventLargeTagValues(100),
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
			if authenticated {
				log.Printf("request from %s\n", pubkey.Hex())
				return false, ""
			}
			return true, "auth-required: only authenticated users can read from this relay"
		},
	)

	//////////////////////////////////////////////////////////////////////////
	// S3 OBJECT STORAGE: preserve the same bucket, sha256 keys and endpoints.

	s3Endpoint := env("S3_ENDPOINT", "http://seaweedfs:8333")
	s3Region := env("S3_REGION", "us-east-1")
	s3AccessKey := env("S3_ACCESS_KEY", "admin")
	s3SecretKey := env("S3_SECRET_KEY", "secret")
	bucketName := env("S3_BUCKET", "kjvonly")

	awsConfig, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion(s3Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(s3AccessKey, s3SecretKey, "")),
	)
	if err != nil {
		log.Fatal(err)
	}

	s3Client := s3.NewFromConfig(awsConfig, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(s3Endpoint)
		options.UsePathStyle = true
	})

	bl := blossom.New(relay, "http://localhost:3335")
	bl.Store = blossom.EventStoreBlobIndexWrapper{Store: store, ServiceURL: bl.ServiceURL}

	bl.StoreBlob = func(ctx context.Context, sha256 string, ext string, body []byte) error {
		_, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:        aws.String(bucketName),
			Key:           aws.String(sha256),
			Body:          bytes.NewReader(body),
			ContentLength: aws.Int64(int64(len(body))),
		})
		return err
	}

	bl.LoadBlob = func(ctx context.Context, sha256 string, ext string) (io.ReadSeeker, *url.URL, error) {
		output, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(sha256),
		})
		if err != nil {
			return nil, nil, err
		}

		data, readErr := io.ReadAll(output.Body)
		closeErr := output.Body.Close()
		if readErr != nil {
			return nil, nil, readErr
		}
		if closeErr != nil {
			return nil, nil, closeErr
		}
		return bytes.NewReader(data), nil, nil
	}

	bl.DeleteBlob = func(ctx context.Context, sha256 string, ext string) error {
		_, err := s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(sha256),
		})
		return err
	}

	fmt.Println("running on :3335")
	if err := http.ListenAndServe(":3335", relay); err != nil {
		log.Fatal(err)
	}
}

// preventLargeTagValues preserves the removed Khatru PreventLargeTags policy.
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
