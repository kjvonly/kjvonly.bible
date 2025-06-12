package noteapp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

// Tag represents a tag.
type Tag struct {
	ID          string `json:"id"` // We should create types for these fields.
	Tag         string `json:"tag"`
	DateCreated string `json:"dateCreated"`
}

// Note represents information about an individual note.
type Note struct {
	ID          string `json:"id"`
	UserID      string `json:"userID"`
	Type        string `json:"type"`
	BCV         string `json:"bcv"`
	ChapterKey  string `json:"chapterKey"`
	Title       string `json:"title"`
	Html        string `json:"html"`
	Text        string `json:"text"`
	Tags        []Tag  `json:"tags"`
	DateCreated string `json:"dateCreated"`
	DateUpdated string `json:"dateUpdated"`
}

// Encode implements the encoder interface.
func (app Note) Encode() ([]byte, string, error) {
	data, err := json.Marshal(app)
	return data, "application/json", err
}

func toAppTags(bus []notebus.Tag) []Tag {
	app := []Tag{}

	for _, t := range bus {
		app = append(app, Tag{
			ID:          t.ID.String(),
			Tag:         t.Tag,
			DateCreated: t.DateCreated.Format(time.RFC3339),
		})
	}

	return app
}

func toAppNote(nte notebus.Note) Note {
	return Note{
		ID:          nte.ID.String(),
		UserID:      nte.UserID.String(),
		Type:        nte.Type.String(),
		BCV:         nte.BCV,
		ChapterKey:  nte.ChapterKey,
		Title:       nte.Title,
		Html:        nte.Html,
		Text:        nte.Text,
		Tags:        toAppTags(nte.Tags),
		DateCreated: nte.DateCreated.Format(time.RFC3339),
		DateUpdated: nte.DateUpdated.Format(time.RFC3339),
	}
}

func toAppNotes(notes []notebus.Note) []Note {
	app := make([]Note, len(notes))
	for i, nte := range notes {
		app[i] = toAppNote(nte)
	}

	return app
}

// =============================================================================

// NewAddress defines the data needed to add a new address.
type NewAddress struct {
	Address1 string `json:"address1" validate:"required,min=1,max=70"`
	Address2 string `json:"address2" validate:"omitempty,max=70"`
	ZipCode  string `json:"zipCode" validate:"required,numeric"`
	City     string `json:"city" validate:"required"`
	State    string `json:"state" validate:"required,min=1,max=48"`
	Country  string `json:"country" validate:"required,iso3166_1_alpha2"`
}

// NewNote defines the data needed to add a new note.
type NewNote struct {
	Type    string     `json:"type" validate:"required"`
	Address NewAddress `json:"address"`
	Tags    []Tag
}

// Decode implements the decoder interface.
func (app *NewNote) Decode(data []byte) error {
	return json.Unmarshal(data, app)
}

// Validate checks if the data in the model is considered clean.
func (app NewNote) Validate() error {
	if err := errs.Check(app); err != nil {
		return fmt.Errorf("validate: %w", err)
	}

	return nil
}

func toBusNewNote(ctx context.Context, app NewNote) (notebus.NewNote, error) {
	userID, err := mid.GetUserID(ctx)
	if err != nil {
		return notebus.NewNote{}, fmt.Errorf("getuserid: %w", err)
	}

	typ, err := notetype.Parse(app.Type)
	if err != nil {
		return notebus.NewNote{}, fmt.Errorf("parse: %w", err)
	}

	bus := notebus.NewNote{
		UserID: userID,
		Type:   typ,
	}

	return bus, nil
}

// =============================================================================

// UpdateAddress defines the data needed to update an address.
type UpdateAddress struct {
	Address1 *string `json:"address1" validate:"omitempty,min=1,max=70"`
	Address2 *string `json:"address2" validate:"omitempty,max=70"`
	ZipCode  *string `json:"zipCode" validate:"omitempty,numeric"`
	City     *string `json:"city"`
	State    *string `json:"state" validate:"omitempty,min=1,max=48"`
	Country  *string `json:"country" validate:"omitempty,iso3166_1_alpha2"`
}

// UpdateNote defines the data needed to update a note.
type UpdateNote struct {
	Type    *string        `json:"type"`
	Address *UpdateAddress `json:"address"`
}

// Decode implements the decoder interface.
func (app *UpdateNote) Decode(data []byte) error {
	return json.Unmarshal(data, app)
}

// Validate checks the data in the model is considered clean.
func (app UpdateNote) Validate() error {
	if err := errs.Check(app); err != nil {
		return fmt.Errorf("validate: %w", err)
	}

	return nil
}

func toBusUpdateNote(app UpdateNote) (notebus.UpdateNote, error) {
	var t notetype.NoteType
	if app.Type != nil {
		var err error
		t, err = notetype.Parse(*app.Type)
		if err != nil {
			return notebus.UpdateNote{}, fmt.Errorf("parse: %w", err)
		}
	}

	bus := notebus.UpdateNote{
		Type: &t,
	}
	return bus, nil
}
