package annotbus

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

// Annot represents an individual annot.
type Annot struct {
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
}

// NewAnnot is what we require from clients when adding a Annot.
type NewAnnot struct {
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

// UpdateAnnot defines what information may be provided to modify an existing
// Annot. All fields are optional so clients can send only the fields they want
// changed. It uses poiantr fields so we can differentiate between a field that
// was not provided and a field that was provided as explicitly blank. Normally
// we do not want to use poiantrs to basic types but we make exception around
// marshalling/unmarshalling.
type UpdateAnnot struct {
	Title   *string
	Html    *string
	Text    *string
	Tags    []Tag
	Version int
}
