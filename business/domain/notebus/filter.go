package notebus

import (
	"time"

	"github.com/google/uuid"
)

// QueryFilter holds the available fields a query can be filtered on.
// We are using pointer semantics because the With API mutates the value.
type QueryFilter struct {
	ID               *uuid.UUID
	UserID           *uuid.UUID
	StartCreatedDate *time.Time
	EndCreatedDate   *time.Time
	StartUpdatedDate *time.Time
}
