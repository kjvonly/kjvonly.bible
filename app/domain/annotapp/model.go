package annotapp

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

// Tag represents an tag.
type WordAnnots struct {
	Class []string `json:"class"`
}

// Tag represents a tag.
type Annots map[int]map[int]WordAnnots

// TODO Add Validate rules. Min Max.
// Annot represents information about an individual annot.
type Annot struct {
	ID              string `json:"id"`
	UserID          string `json:"userID"`
	ReferenceVector string `json:"chapter_key"`
	Annots          Annots `json:"annots"`
	Version         int    `json:"version"`
	DateCreated     int64  `json:"dateCreated"`
	DateUpdated     int64  `json:"dateUpdated"`
}

// Encode implements the encoder interface.
func (app Annot) Encode() ([]byte, string, error) {
	data, err := json.Marshal(app)
	return data, "application/json", err
}

func toAppAnnot(nte annotbus.Annot) Annot {
	var annots Annots

	for k1, v1 := range nte.Annots {
		for k2, v2 := range v1 {
			annots[k1][k2] = WordAnnots{
				Class: v2.Class,
			}
		}
	}

	return Annot{
		UserID:          nte.UserID.String(),
		ReferenceVector: fmt.Sprintf("%d_%d", nte.BookID, nte.Chapter),
		Annots:          annots,
		Version:         nte.Version,
		DateCreated:     nte.DateCreated.Unix(),
		DateUpdated:     nte.DateUpdated.Unix(),
	}
}

func toAppAnnots(annots []annotbus.Annot) []Annot {
	app := make([]Annot, len(annots))
	for i, nte := range annots {
		app[i] = toAppAnnot(nte)
	}

	return app
}

// =============================================================================

// NewAnnot defines the data needed to add a new annot.
type NewAnnot struct {
	ReferenceVector string `json:"chapter_key" validate:"required"`
	Annots          Annots `json:"annots" validate:"required"`
	Version         int    `json:"version" validate:"required"`
}

// Decode implements the decoder interface.
func (app *NewAnnot) Decode(data []byte) error {
	return json.Unmarshal(data, app)
}

// Validate checks if the data in the model is considered clean.
func (app NewAnnot) Validate() error {
	if err := errs.Check(app); err != nil {
		return fmt.Errorf("validate: %w", err)
	}

	return nil
}

func toBusNewAnnot(ctx context.Context, app NewAnnot) (annotbus.NewAnnot, error) {
	userID, err := mid.GetUserID(ctx)
	if err != nil {
		return annotbus.NewAnnot{}, fmt.Errorf("getuserid: %w", err)
	}

	keys := strings.Split(app.ReferenceVector, "_")

	if len(keys) != 2 {
		return annotbus.NewAnnot{}, fmt.Errorf("parsechapterkey: %w", err)
	}

	bookID, err := strconv.ParseInt(keys[0], 10, 0)
	if err != nil {
		return annotbus.NewAnnot{}, fmt.Errorf("parsebookid: %w", err)
	}

	chapter, err := strconv.ParseInt(keys[1], 10, 0)
	if err != nil {
		return annotbus.NewAnnot{}, fmt.Errorf("parsechapter: %w", err)
	}

	var annots annotbus.Annots
	for k1, v1 := range app.Annots {
		for k2, v2 := range v1 {
			annots[k1][k2] = annotbus.WordAnnots{
				Class: v2.Class,
			}
		}
	}

	bus := annotbus.NewAnnot{
		UserID:  userID,
		BookID:  int(bookID),
		Chapter: int(chapter),
		Annots:  annots,
		Version: app.Version,
	}

	return bus, nil
}

// =============================================================================

// UpdateAnnot defines the data needed to update a annot.
type UpdateAnnot struct {
	Version int    `json:"version"`
	Annots  Annots `json:"annots"`
}

// Decode implements the decoder interface.
func (app *UpdateAnnot) Decode(data []byte) error {
	return json.Unmarshal(data, app)
}

// Validate checks the data in the model is considered clean.
func (app UpdateAnnot) Validate() error {
	if err := errs.Check(app); err != nil {
		return fmt.Errorf("validate: %w", err)
	}

	return nil
}

func toBusUpdateAnnot(app UpdateAnnot) (annotbus.UpdateAnnot, error) {
	var annots annotbus.Annots
	for k1, v1 := range app.Annots {
		for k2, v2 := range v1 {
			annots[k1][k2] = annotbus.WordAnnots{
				Class: v2.Class,
			}
		}
	}

	bus := annotbus.UpdateAnnot{
		Annots:  annots,
		Version: app.Version,
	}
	return bus, nil
}
