package noteapp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

// Tag represents a tag.
type Tag struct {
	ID          string `json:"id" validate:"required,uuid"` // We should create types for these fields.
	Tag         string `json:"tag"`
	DateCreated int64  `json:"dateCreated"`
}

// TODO Add Validate rules. Min Max.
// Note represents information about an individual note.
type Note struct {
	ID          string `json:"id"`
	UserID      string `json:"userID"`
	OfflineID   string `json:"offlineID"`
	Type        string `json:"type"`
	BCV         string `json:"bcv"`
	ChapterKey  string `json:"chapterKey"`
	Title       string `json:"title"`
	Html        string `json:"html"`
	Text        string `json:"text"`
	Tags        []Tag  `json:"tags"`
	DateCreated int64  `json:"dateCreated"`
	DateUpdated int64  `json:"dateUpdated"`
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
			DateCreated: t.DateCreated.Unix(),
		})
	}

	return app
}

func toAppNote(nte notebus.Note) Note {
	return Note{
		ID:          nte.ID.String(),
		UserID:      nte.UserID.String(),
		OfflineID:   nte.OfflineID.String(),
		Type:        nte.Type.String(),
		BCV:         nte.BCV,
		ChapterKey:  nte.ChapterKey,
		Title:       nte.Title,
		Html:        nte.Html,
		Text:        nte.Text,
		Tags:        toAppTags(nte.Tags),
		DateCreated: nte.DateCreated.Unix(),
		DateUpdated: nte.DateUpdated.Unix(),
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

// NewNote defines the data needed to add a new note.
type NewNote struct {
	OfflineID  string `json:"offlineID" validate:"required,uuid"`
	Type       string `json:"type" validate:"required"`
	ChapterKey string `json:"chapterKey" validate:"required"`
	BCV        string `json:"bcv"`
	Title      string `json:"title"`
	Html       string `json:"html"`
	Text       string `json:"text"`
	Tags       []Tag  `json:"tags" validate:"dive"`
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

func toBusTags(app []Tag) []notebus.Tag {
	bus := []notebus.Tag{}

	for _, a := range app {
		// TODO Should we go ahead and check the err here
		// Validate checks
		id, _ := uuid.Parse(a.ID)
		b := notebus.Tag{
			ID:          id,
			Tag:         a.Tag,
			DateCreated: time.Unix(a.DateCreated, 0),
		}
		bus = append(bus, b)
	}

	return bus
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

	offlineID, err := uuid.ParseBytes([]byte(app.OfflineID))
	if err != nil {
		return notebus.NewNote{}, fmt.Errorf("getofflineid: %w", err)
	}

	bus := notebus.NewNote{
		UserID:     userID,
		OfflineID:  offlineID,
		Type:       typ,
		BCV:        app.BCV,
		ChapterKey: app.ChapterKey,
		Title:      app.Title,
		Html:       app.Html,
		Text:       app.Text,
		Tags:       toBusTags(app.Tags),
	}

	return bus, nil
}

// =============================================================================

// UpdateNote defines the data needed to update a note.
type UpdateNote struct {
	Type  *string `json:"type"`
	Title *string `json:"title"`
	Html  *string `json:"html"`
	Text  *string `json:"text"`
	Tags  []Tag   `json:"tags" validate:"dive"`
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
		Type:  &t,
		Title: app.Title,
		Html:  app.Html,
		Text:  app.Text,
		Tags:  toBusTags(app.Tags),
	}
	return bus, nil
}
