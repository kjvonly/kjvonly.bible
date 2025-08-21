package annotbus

import (
	"time"

	"github.com/google/uuid"
)

// Tag represents an tag.
type WordAnnots struct {
	Class []string
}

// map[verse]map[word_index]
type Annots map[int]map[int]WordAnnots

// Annot represents an individual annot.
type Annot struct {
	UserID      uuid.UUID
	BookID      int
	Chapter     int
	Annots      Annots
	Version     int
	DateCreated time.Time
	DateUpdated time.Time
}

// NewAnnot is what we require from clients when adding a Annot.
type NewAnnot struct {
	UserID  uuid.UUID
	BookID  int
	Chapter int
	Annots  Annots
	Version int
}

// UpdateTags is what fields can be updated in the store.
type UpdateTags struct {
	Tags string
}

type UpdateAnnot struct {
	Annots  Annots
	Version int
}
