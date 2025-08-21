package annotbus

import "github.com/kjvonly/kjvonly.bible/business/sdk/order"

// DefaultOrderBy represents the default way we sort.
var DefaultOrderBy = order.NewBy(OrderByBookIDAndChapter, order.ASC)

// Set of fields that the results can be ordered by.
const (
	OrderByBookIDAndChapter = "a"
	OrderByUserID           = "b"
)
