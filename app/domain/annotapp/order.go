package annotapp

import (
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

var orderByFields = map[string]string{
	"annot_id": annotbus.OrderByBookIDAndChapter,
	"user_id":  annotbus.OrderByUserID,
}
