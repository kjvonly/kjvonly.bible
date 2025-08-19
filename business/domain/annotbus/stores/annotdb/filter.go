package annotdb

import (
	"bytes"
	"strings"

	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

func (s *Store) applyFilter(filter annotbus.QueryFilter, data map[string]any, buf *bytes.Buffer) {
	var wc []string

	if filter.BookID != nil {
		data["book_id"] = filter.BookID
		wc = append(wc, "book_id = :book_id")
	}

	if filter.Chapter != nil {
		data["chapter"] = filter.Chapter
		wc = append(wc, "chapter = :chapter")
	}

	if filter.UserID != nil {
		data["user_id"] = filter.UserID
		wc = append(wc, "user_id = :user_id")
	}

	if filter.StartCreatedDate != nil {
		data["start_date_created"] = filter.StartCreatedDate.UTC()
		wc = append(wc, "date_created >= :start_date_created")
	}

	if filter.EndCreatedDate != nil {
		data["end_date_created"] = filter.EndCreatedDate.UTC()
		wc = append(wc, "date_created <= :end_date_created")
	}

	if len(wc) > 0 {
		buf.WriteString(" WHERE ")
		buf.WriteString(strings.Join(wc, " AND "))
	}
}
