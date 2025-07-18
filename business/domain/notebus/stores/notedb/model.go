package notedb

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx/types"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

type note struct {
	ID          uuid.UUID      `db:"note_id"`
	UserID      uuid.UUID      `db:"user_id"`
	OfflineID   uuid.UUID      `db:"offline_id"`
	Type        string         `db:"type"`
	BCV         string         `db:"bcv"`
	ChapterKey  string         `db:"chapter_key"`
	Html        string         `db:"html"`
	Text        string         `db:"text"`
	Title       string         `db:"title"`
	Tags        types.JSONText `db:"tags"`
	DateCreated time.Time      `db:"date_created"`
	DateUpdated time.Time      `db:"date_updated"`
}

func toDBNote(bus notebus.Note) (note, error) {
	jsonTags, err := json.MarshalIndent(bus.Tags, "", "  ")
	if err != nil {
		return note{}, fmt.Errorf("parse type: %w", err)
	}

	db := note{
		ID:          bus.ID,
		UserID:      bus.UserID,
		OfflineID:   bus.OfflineID,
		Type:        bus.Type.String(),
		BCV:         bus.BCV,
		ChapterKey:  bus.ChapterKey,
		Title:       bus.Title,
		Html:        bus.Html,
		Text:        bus.Text,
		Tags:        jsonTags,
		DateCreated: bus.DateCreated.UTC(),
		DateUpdated: bus.DateUpdated.UTC(),
	}

	return db, nil
}

func toBusNote(db note) (notebus.Note, error) {
	typ, err := notetype.Parse(db.Type)
	if err != nil {
		return notebus.Note{}, fmt.Errorf("parse type: %w", err)
	}

	var tags []notebus.Tag
	if err := json.Unmarshal(db.Tags, &tags); err != nil {
		return notebus.Note{}, fmt.Errorf("parse type: %w", err)
	}

	bus := notebus.Note{
		ID:          db.ID,
		UserID:      db.UserID,
		OfflineID:   db.OfflineID,
		Type:        typ,
		BCV:         db.BCV,
		ChapterKey:  db.ChapterKey,
		Title:       db.Title,
		Html:        db.Html,
		Text:        db.Text,
		Tags:        tags,
		DateCreated: db.DateCreated.In(time.Local),
		DateUpdated: db.DateUpdated.In(time.Local),
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
