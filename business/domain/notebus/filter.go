package notebus

import (
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/types/notetype"
)

// QueryFilter holds the available fields a query can be filtered on.
// We are using pointer semantics because the With API mutates the value.
type QueryFilter struct {
	ID               *uuid.UUID
	UserID           *uuid.UUID
	Type             *notetype.NoteType
	StartCreatedDate *time.Time
	EndCreatedDate   *time.Time
}
