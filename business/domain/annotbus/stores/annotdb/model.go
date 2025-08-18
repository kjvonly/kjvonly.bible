package annotdb

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx/types"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

type annot struct {
	ID          uuid.UUID      `db:"annot_id"`
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
}

func toDBAnnot(bus annotbus.Annot) (annot, error) {
	jsonTags, err := json.MarshalIndent(bus.Tags, "", "  ")
	if err != nil {
		return annot{}, fmt.Errorf("parse type: %w", err)
	}

	db := annot{
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
	}

	return db, nil
}

func toBusAnnot(db annot) (annotbus.Annot, error) {

	var tags []annotbus.Tag
	if err := json.Unmarshal(db.Tags, &tags); err != nil {
		return annotbus.Annot{}, fmt.Errorf("parse type: %w", err)
	}

	bus := annotbus.Annot{
		ID:          db.ID,
		UserID:      db.UserID,
		BookID:      db.BookID,
		Chapter:     db.Chapter,
		Verse:       db.Chapter,
		WordIndex:   db.WordIndex,
		Title:       db.Title,
		Html:        db.Html,
		Text:        db.Text,
		Tags:        tags,
		Version:     db.Version,
		DateCreated: db.DateCreated.In(time.Local),
		DateUpdated: db.DateUpdated.In(time.Local),
	}

	return bus, nil
}

func toBusAnnots(dbs []annot) ([]annotbus.Annot, error) {
	bus := make([]annotbus.Annot, len(dbs))

	for i, db := range dbs {
		var err error
		bus[i], err = toBusAnnot(db)
		if err != nil {
			return nil, fmt.Errorf("parse type: %w", err)
		}
	}

	return bus, nil
}
