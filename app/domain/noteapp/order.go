package noteapp

import (
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

var orderByFields = map[string]string{
	"note_id": notebus.OrderByID,
	"type":    notebus.OrderByType,
	"user_id": notebus.OrderByUserID,
}
