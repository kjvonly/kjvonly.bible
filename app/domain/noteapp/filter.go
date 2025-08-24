package noteapp

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

type queryParams struct {
	Page             string
	Rows             string
	OrderBy          string
	ID               string
	UserID           string
	Type             string
	StartCreatedDate string
	EndCreatedDate   string
	StartUpdatedDate string
}

func parseQueryParams(r *http.Request) queryParams {
	values := r.URL.Query()

	filter := queryParams{
		Page:             values.Get("page"),
		Rows:             values.Get("rows"),
		OrderBy:          values.Get("orderBy"),
		ID:               values.Get("note_id"),
		UserID:           values.Get("user_id"),
		StartCreatedDate: values.Get("start_created_date"),
		EndCreatedDate:   values.Get("end_created_date"),
		StartUpdatedDate: values.Get("start_updated_date"),
	}

	return filter
}

func parseFilter(qp queryParams) (notebus.QueryFilter, error) {
	var fieldErrors errs.FieldErrors
	var filter notebus.QueryFilter

	if qp.ID != "" {
		id, err := uuid.Parse(qp.ID)
		switch err {
		case nil:
			filter.ID = &id
		default:
			fieldErrors.Add("note_id", err)
		}
	}

	if qp.UserID != "" {
		id, err := uuid.Parse(qp.UserID)
		switch err {
		case nil:
			filter.UserID = &id
		default:
			fieldErrors.Add("user_id", err)
		}
	}

	if qp.StartCreatedDate != "" {
		t, err := time.Parse(time.RFC3339, qp.StartCreatedDate)
		switch err {
		case nil:
			filter.StartCreatedDate = &t
		default:
			fieldErrors.Add("start_created_date", err)
		}
	}

	if qp.EndCreatedDate != "" {
		t, err := time.Parse(time.RFC3339, qp.EndCreatedDate)
		switch err {
		case nil:
			filter.EndCreatedDate = &t
		default:
			fieldErrors.Add("end_created_date", err)
		}
	}

	if qp.StartUpdatedDate != "" {
		t, err := strconv.ParseInt(qp.StartUpdatedDate, 0, 64)
		if err != nil {
			fieldErrors.Add("start_updated_date", err)
		} else {
			ti := time.Unix(t, 0)
			filter.StartUpdatedDate = &ti
		}
	}

	if fieldErrors != nil {
		return notebus.QueryFilter{}, fieldErrors.ToError()
	}

	return filter, nil
}
