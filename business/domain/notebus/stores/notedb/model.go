package notedb

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx/types"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

type note struct {
	ID          uuid.UUID      `db:"note_id"`
	UserID      uuid.UUID      `db:"user_id"`
	BookID      int            `db:"book_id"`
	Chapter     int            `db:"chapter"`
	Verse       int            `db:"verse"`
	WordIndex   int            `db:"word_index"`
	Html        string         `db:"html"`
	Text        string         `db:"text"`
	Title       string         `db:"title"`
	Tags        types.JSONText `db:"tags"`
	Version     int            `db:"version"`
	DateCreated time.Time      `db:"date_created"`
	DateUpdated time.Time      `db:"date_updated"`
	DateDeleted time.Time      `db:"date_deleted"`
}

func toDBNote(bus notebus.Note) (note, error) {
	jsonTags, err := json.MarshalIndent(bus.Tags, "", "  ")
	if err != nil {
		return note{}, fmt.Errorf("parse type: %w", err)
	}

	db := note{
		ID:          bus.ID,
		UserID:      bus.UserID,
		BookID:      bus.BookID,
		Chapter:     bus.Chapter,
		Verse:       bus.Verse,
		WordIndex:   bus.WordIndex,
		Title:       bus.Title,
		Html:        bus.Html,
		Text:        bus.Text,
		Tags:        jsonTags,
		Version:     bus.Version,
		DateCreated: bus.DateCreated.UTC(),
		DateUpdated: bus.DateUpdated.UTC(),
		DateDeleted: bus.DateDeleted.UTC(),
	}

	return db, nil
}

func toBusNote(db note) (notebus.Note, error) {

	var tags []notebus.Tag
	if err := json.Unmarshal(db.Tags, &tags); err != nil {
		return notebus.Note{}, fmt.Errorf("parse type: %w", err)
	}

	bus := notebus.Note{
		ID:          db.ID,
		UserID:      db.UserID,
		BookID:      db.BookID,
		Chapter:     db.Chapter,
		Verse:       db.Verse,
		WordIndex:   db.WordIndex,
		Title:       db.Title,
		Html:        db.Html,
		Text:        db.Text,
		Tags:        tags,
		Version:     db.Version,
		DateCreated: db.DateCreated.In(time.Local),
		DateUpdated: db.DateUpdated.In(time.Local),
		DateDeleted: db.DateDeleted.In(time.Local),
	}

	return bus, nil
}

func toBusNotes(dbs []note) ([]notebus.Note, error) {
	bus := make([]notebus.Note, len(dbs))

	for i, db := range dbs {
		var err error
		bus[i], err = toBusNote(db)
		if err != nil {
			return nil, fmt.Errorf("parse type: %w", err)
		}
	}

	return bus, nil
}
