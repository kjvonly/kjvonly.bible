package notedb

import (
	"bytes"
	"strings"

	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

func (s *Store) applyFilter(filter notebus.QueryFilter, data map[string]any, buf *bytes.Buffer) {
	var wc []string

	if filter.ID != nil {
		data["note_id"] = filter.ID
		wc = append(wc, "note_id = :note_id")
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

	if filter.StartUpdatedDate != nil {
		data["start_date_updated"] = filter.StartUpdatedDate.UTC()
		wc = append(wc, "date_updated >= :start_date_updated")
	}

	if len(wc) > 0 {
		buf.WriteString(" WHERE ")
		buf.WriteString(strings.Join(wc, " AND "))
	}
}
