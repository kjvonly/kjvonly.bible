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
	UserID      uuid.UUID      `db:"user_id"`
	BookID      int            `db:"book_id"`
	Chapter     int            `db:"chapter"`
	Annots      types.JSONText `db:"annots"`
	Version     int            `db:"version"`
	DateCreated time.Time      `db:"date_created"`
	DateUpdated time.Time      `db:"date_updated"`
}

func toDBAnnot(bus annotbus.Annot) (annot, error) {
	jsonAnnots, err := json.MarshalIndent(bus.Annots, "", "  ")
	if err != nil {
		return annot{}, fmt.Errorf("parse type: %w", err)
	}

	db := annot{
		UserID:      bus.UserID,
		BookID:      bus.BookID,
		Chapter:     bus.Chapter,
		Annots:      jsonAnnots,
		Version:     bus.Version,
		DateCreated: bus.DateCreated.UTC(),
		DateUpdated: bus.DateUpdated.UTC(),
	}

	return db, nil
}

func toBusAnnot(db annot) (annotbus.Annot, error) {

	var annots annotbus.Annots
	if err := json.Unmarshal(db.Annots, &annots); err != nil {
		return annotbus.Annot{}, fmt.Errorf("parse type: %w", err)
	}

	bus := annotbus.Annot{
		UserID:      db.UserID,
		BookID:      db.BookID,
		Chapter:     db.Chapter,
		Annots:      annots,
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
