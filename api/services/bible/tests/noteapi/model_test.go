package note_test

import (
	"time"

	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

func toAppNote(nte notebus.Note) noteapp.Note {
	return noteapp.Note{
		ID:          nte.ID.String(),
		UserID:      nte.UserID.String(),
		Type:        nte.Type.String(),
		DateCreated: nte.DateCreated.Format(time.RFC3339),
		DateUpdated: nte.DateUpdated.Format(time.RFC3339),
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
