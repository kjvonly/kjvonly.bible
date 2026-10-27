package main

import (
	"context"
	"strings"
	"testing"

	"fiatjaf.com/nostr"
)

func TestLargeTagValuePolicy(t *testing.T) {
	validate := preventLargeTagValues(512)
	if reject, _ := validate(context.Background(), nostr.Event{Tags: nostr.Tags{{"d", strings.Repeat("x", 512)}}}); reject {
		t.Fatal("exact limit should be accepted")
	}
	if reject, _ := validate(context.Background(), nostr.Event{Tags: nostr.Tags{{"d", strings.Repeat("x", 513)}}}); !reject {
		t.Fatal("over limit should be rejected")
	}
	if reject, _ := validate(context.Background(), nostr.Event{Tags: nostr.Tags{{"long", strings.Repeat("x", 513)}}}); reject {
		t.Fatal("nonindexable tags must retain the previous exemption")
	}
}
