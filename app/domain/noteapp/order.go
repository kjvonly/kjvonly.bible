package noteapp

import (
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

var orderByFields = map[string]string{
	"note_id":      notebus.OrderByID,
	"user_id":      notebus.OrderByUserID,
	"date_updated": notebus.OrderDateUpdated,
}
