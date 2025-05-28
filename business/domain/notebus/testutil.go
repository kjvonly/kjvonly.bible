package notebus

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

// TestGenerateNewNotes is a helper method for testing.
func TestGenerateNewNotes(n int, userID uuid.UUID) []NewNote {
	newHmes := make([]NewNote, n)

	idx := rand.Intn(10000)
	for i := range n {
		idx++

		t := notetype.Private
		if v := (idx + i) % 2; v == 0 {
			t = notetype.Shared
		}

		nh := NewNote{
			Type: t,
			Address: Address{
				Address1: fmt.Sprintf("Address%d", idx),
				Address2: fmt.Sprintf("Address%d", idx),
				ZipCode:  fmt.Sprintf("%05d", idx),
				City:     fmt.Sprintf("City%d", idx),
				State:    fmt.Sprintf("State%d", idx),
				Country:  fmt.Sprintf("Country%d", idx),
			},
			UserID: userID,
		}

		newHmes[i] = nh
	}

	return newHmes
}

// TestGenerateSeedNotes is a helper method for testing.
func TestGenerateSeedNotes(ctx context.Context, n int, api *Business, userID uuid.UUID) ([]Note, error) {
	newHmes := TestGenerateNewNotes(n, userID)

	hmes := make([]Note, len(newHmes))
	for i, nh := range newHmes {
		hme, err := api.Create(ctx, nh)
		if err != nil {
			return nil, fmt.Errorf("seeding note: idx: %d : %w", i, err)
		}

		hmes[i] = hme
	}

	return hmes, nil
}

// ParseAddress is a helper function to create an address value.
func ParseAddress(address1 string, address2 string, zipCode string, city string, state string, country string) Address {
	return Address{
		Address1: address1,
		Address2: address2,
		ZipCode:  zipCode,
		City:     city,
		State:    state,
		Country:  country,
	}
}
