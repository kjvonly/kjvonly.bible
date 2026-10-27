package main

import (
	"context"
	"strings"
	"testing"

	"fiatjaf.com/nostr"
)

func TestLargeTagValuePolicy(t *testing.T) {
	validate := preventLargeTagValues(100)
	if reject, _ := validate(context.Background(), nostr.Event{Tags: nostr.Tags{{"x", strings.Repeat("a", 100)}}}); reject {
		t.Fatal("exact limit should be accepted")
	}
	if reject, _ := validate(context.Background(), nostr.Event{Tags: nostr.Tags{{"x", strings.Repeat("a", 101)}}}); !reject {
		t.Fatal("over limit should be rejected")
	}
}
