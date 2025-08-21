package annotapp

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

type queryParams struct {
	Page             string
	Rows             string
	OrderBy          string
	UserID           string
	AnnotID          string
	BookID           string
	Chapter          string
	Type             string
	StartCreatedDate string
	EndCreatedDate   string
}

func parseQueryParams(r *http.Request) queryParams {
	values := r.URL.Query()

	filter := queryParams{
		Page:             values.Get("page"),
		Rows:             values.Get("rows"),
		OrderBy:          values.Get("orderBy"),
		UserID:           values.Get("user_id"),
		AnnotID:          values.Get("annot_id"),
		BookID:           values.Get("book_id"),
		Chapter:          values.Get("chapter"),
		StartCreatedDate: values.Get("start_created_date"),
		EndCreatedDate:   values.Get("end_created_date"),
	}

	return filter
}

func parseFilter(qp queryParams) (annotbus.QueryFilter, error) {
	var fieldErrors errs.FieldErrors
	var filter annotbus.QueryFilter

	if qp.UserID != "" {
		id, err := uuid.Parse(qp.UserID)
		switch err {
		case nil:
			filter.UserID = &id
		default:
			fieldErrors.Add("user_id", err)
		}
	}

	if qp.AnnotID != "" {
		bc := strings.Split(qp.AnnotID, "_")
		if len(bc) != 2 {
			fieldErrors.Add("annot_id", fmt.Errorf("should be length 2 but was %d", len(bc)))
			return annotbus.QueryFilter{}, fieldErrors.ToError()
		}

		bookid, err := strconv.ParseInt(bc[0], 10, 0)
		switch err {
		case nil:
			smallInt := int(bookid)
			filter.BookID = &smallInt
		default:
			fieldErrors.Add("annot_id: book_id", err)
			return annotbus.QueryFilter{}, fieldErrors.ToError()
		}

		chapter, err := strconv.ParseInt(bc[0], 10, 0)
		switch err {
		case nil:
			smallInt := int(chapter)
			filter.Chapter = &smallInt
		default:
			fieldErrors.Add("annot_id: chapter", err)
			return annotbus.QueryFilter{}, fieldErrors.ToError()
		}
	}

	if qp.BookID != "" {
		id, err := strconv.ParseInt(qp.BookID, 10, 0)
		switch err {
		case nil:
			smallInt := int(id)
			filter.BookID = &smallInt
		default:
			fieldErrors.Add("book_id", err)
		}
	}

	if qp.Chapter != "" {
		id, err := strconv.ParseInt(qp.Chapter, 10, 0)
		switch err {
		case nil:
			smallInt := int(id)
			filter.Chapter = &smallInt
		default:
			fieldErrors.Add("chapter", err)
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

	if fieldErrors != nil {
		return annotbus.QueryFilter{}, fieldErrors.ToError()
	}

	return filter, nil
}
