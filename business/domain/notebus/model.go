package notebus

import (
	"time"

	"github.com/google/uuid"
)

// Tag represents an tag.
type Tag struct {
	ID          uuid.UUID // We should create types for these fields.
	Tag         string
	DateCreated time.Time
}

// Note represents an individual note.
type Note struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	BookID      int
	Chapter     int
	Verse       int
	WordIndex   int
	Title       string
	Html        string
	Text        string
	Tags        []Tag
	Version     int
	DateCreated time.Time
	DateUpdated time.Time
	DateDeleted time.Time
}

// NewNote is what we require from clients when adding a Note.
type NewNote struct {
	UserID    uuid.UUID
	BookID    int
	Chapter   int
	Verse     int
	WordIndex int
	Title     string
	Html      string
	Text      string
	Tags      []Tag
	Version   int
}

// UpdateTags is what fields can be updated in the store.
type UpdateTags struct {
	Tags string
}

// UpdateNote defines what information may be provided to modify an existing
// Note. All fields are optional so clients can send only the fields they want
// changed. It uses pointer fields so we can differentiate between a field that
// was not provided and a field that was provided as explicitly blank. Normally
// we do not want to use pointers to basic types but we make exception around
// marshalling/unmarshalling.
type UpdateNote struct {
	Title   *string
	Html    *string
	Text    *string
	Tags    []Tag
	Version int
}
