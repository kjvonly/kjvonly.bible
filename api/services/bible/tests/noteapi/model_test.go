package note_test

import (
	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

func toAppTags(bus []notebus.Tag) []noteapp.Tag {
	app := []noteapp.Tag{}

	for _, t := range bus {
		app = append(app, noteapp.Tag{
			ID:          t.ID.String(),
			Tag:         t.Tag,
			DateCreated: t.DateCreated.Unix(),
		})
	}

	return app
}

func toAppNote(nte notebus.Note) noteapp.Note {
	return noteapp.Note{
		ID:          nte.ID.String(),
		UserID:      nte.UserID.String(),
		Tags:        toAppTags(nte.Tags),
		DateCreated: nte.DateCreated.Unix(),
		DateUpdated: nte.DateUpdated.Unix(),
	}
}

func toAppNotes(notes []notebus.Note) []noteapp.Note {
	items := make([]noteapp.Note, len(notes))
	for i, nte := range notes {
		items[i] = toAppNote(nte)
	}

	return items
}

func toAppNotePtr(nte notebus.Note) *noteapp.Note {
	appNte := toAppNote(nte)
	return &appNte
}
