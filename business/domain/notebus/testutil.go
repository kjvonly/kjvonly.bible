package notebus

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// TestGenerateNewNotes is a helper method for testing.
func TestGenerateNewNotes(n int, userID uuid.UUID) []NewNote {
	newNtes := make([]NewNote, n)

	idx := rand.Intn(10000)
	for i := range n {
		idx++

		nh := NewNote{
			Tags: []Tag{
				{
					ID:          uuid.New(),
					Tag:         fmt.Sprintf("Address%d", idx),
					DateCreated: time.Now(),
				},
			},
			UserID: userID,
		}

		newNtes[i] = nh
	}

	return newNtes
}

// TestGenerateSeedNotes is a helper method for testing.
func TestGenerateSeedNotes(ctx context.Context, n int, api *Business, userID uuid.UUID) ([]Note, error) {
	newNtes := TestGenerateNewNotes(n, userID)

	ntes := make([]Note, len(newNtes))
	for i, nh := range newNtes {
		nte, err := api.Create(ctx, nh)
		if err != nil {
			return nil, fmt.Errorf("seeding note: idx: %d : %w", i, err)
		}

		ntes[i] = nte
	}

	return ntes, nil
}
