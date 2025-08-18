package annotbus

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// TestGenerateNewAnnots is a helper method for testing.
func TestGenerateNewAnnots(n int, userID uuid.UUID) []NewAnnot {
	newNtes := make([]NewAnnot, n)

	idx := 2
	for i := range n {
		idx++

		nh := NewAnnot{
			Annots: Annots{
				16: {
					1: {
						Class: []string{"bg-highlighta"},
					},
					2: {
						Class: []string{"bg-highlighta"},
					},
				},
			},
			UserID:  userID,
			BookID:  50, // John
			Chapter: idx,
			Version: 1,
		}

		newNtes[i] = nh
	}

	return newNtes
}

// TestGenerateSeedAnnots is a helper method for testing.
func TestGenerateSeedAnnots(ctx context.Context, n int, api *Business, userID uuid.UUID) ([]Annot, error) {
	newNtes := TestGenerateNewAnnots(n, userID)

	ants := make([]Annot, len(newNtes))
	for i, nh := range newNtes {
		ant, err := api.Create(ctx, nh)
		if err != nil {
			return nil, fmt.Errorf("seeding annot: idx: %d : %w", i, err)
		}

		ants[i] = ant
	}

	return ants, nil
}
