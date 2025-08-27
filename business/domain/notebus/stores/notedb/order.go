package notedb

import (
	"fmt"

	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
)

var orderByFields = map[string]string{
	notebus.OrderByID:          "note_id",
	notebus.OrderByUserID:      "user_id",
	notebus.OrderByDateUpdated: "date_updated",
}

func orderByClause(orderBy order.By) (string, error) {
	by, exists := orderByFields[orderBy.Field]
	if !exists {
		return "", fmt.Errorf("field %q does not exist", orderBy.Field)
	}

	return " ORDER BY " + by + " " + orderBy.Direction, nil
}
