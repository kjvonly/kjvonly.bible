package annotbus

import (
	"time"

	"github.com/google/uuid"
)

// QueryFilter holds the available fields a query can be filtered on.
// We are using poiantr semantics because the With API mutates the value.
type QueryFilter struct {
	BookID           *int
	Chapter          *int
	UserID           *uuid.UUID
	StartCreatedDate *time.Time
	EndCreatedDate   *time.Time
}
