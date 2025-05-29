package notedb

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/sqldb/dbarray"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

type note struct {
	ID     uuid.UUID `db:"note_id"`
	UserID uuid.UUID `db:"user_id"`
	Type   string    `db:"type"`

	BCV        string          `db:"bcv"`
	ChapterKey string          `db:"chapter_key"`
	Html       string          `db:"html"`
	Text       string          `db:"text"`
	Title      string          `db:"title"`
	Tags       dbarray.Generic `db:"tags"`

	// ------------------------------------------------------------------------

	Address1    string    `db:"address_1"`
	Address2    string    `db:"address_2"`
	ZipCode     string    `db:"zip_code"`
	City        string    `db:"city"`
	Country     string    `db:"country"`
	State       string    `db:"state"`
	DateCreated time.Time `db:"date_created"`
	DateUpdated time.Time `db:"date_updated"`
}

func toDBNote(bus notebus.Note) note {
	db := note{
		ID:         bus.ID,
		UserID:     bus.UserID,
		Type:       bus.Type.String(),
		BCV:        bus.BCV,
		ChapterKey: bus.ChapterKey,
		Title:      bus.Title,
		Html:       bus.Html,
		Text:       bus.Text,
		Tags:       dbarray.Generic{[]notebus.Tag{{}, {}, {}}}, // TODO update when tags becomes array

		Address2:    bus.Tags.Tag,
		DateCreated: bus.DateCreated.UTC(),
		DateUpdated: bus.DateUpdated.UTC(),
	}

	return db
}

func toBusNote(db note) (notebus.Note, error) {
	typ, err := notetype.Parse(db.Type)
	if err != nil {
		return notebus.Note{}, fmt.Errorf("parse type: %w", err)
	}

	bus := notebus.Note{
		ID:     db.ID,
		UserID: db.UserID,
		Type:   typ,

		BCV:        db.BCV,
		ChapterKey: db.ChapterKey,
		Title:      db.Title,
		Html:       db.Html,
		Text:       db.Text,
		Tags:       notebus.Tag{
			// TODO fill this out
		},
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
