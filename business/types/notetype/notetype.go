// Package notetype represents the note type in the system.
package notetype

import "fmt"

// The set of types that can be used.
var (
	Private = newType("private")
	Shared  = newType("shared")
)

// =============================================================================

// Set of known note types.
var noteTypes = make(map[string]NoteType)

// NoteType represents a type in the system.
type NoteType struct {
	value string
}

func newType(noteType string) NoteType {
	ht := NoteType{noteType}
	noteTypes[noteType] = ht
	return ht
}

// String returns the name of the type.
func (ht NoteType) String() string {
	return ht.value
}

// Equal provides support for the go-cmp package and testing.
func (ht NoteType) Equal(ht2 NoteType) bool {
	return ht.value == ht2.value
}

// MarshalText provides support for logging and any marshal needs.
func (ht NoteType) MarshalText() ([]byte, error) {
	return []byte(ht.value), nil
}

// =============================================================================

// Parse parses the string value and returns a note type if one exists.
func Parse(value string) (NoteType, error) {
	typ, exists := noteTypes[value]
	if !exists {
		return NoteType{}, fmt.Errorf("invalid note type %q", value)
	}

	return typ, nil
}

// MustParse parses the string value and returns a note type if one exists. If
// an error occurs the function panics.
func MustParse(value string) NoteType {
	typ, err := Parse(value)
	if err != nil {
		panic(err)
	}

	return typ
}
