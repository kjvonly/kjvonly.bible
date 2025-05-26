package userbus

import "github.com/kjvonly/kjvonly.bible/business/sdk/order"

// DefaultOrderBy represents the default way we sort.
var DefaultOrderBy = order.NewBy(OrderByID, order.ASC)

// Set of fields that the results can be ordered by.
const (
	OrderByID      = "a"
	OrderByName    = "b"
	OrderByEmail   = "c"
	OrderByRoles   = "d"
	OrderByEnabled = "e"
)
