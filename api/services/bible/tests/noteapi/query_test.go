package note_test

import (
	"fmt"
	"net/http"
	"sort"

	"github.com/google/go-cmp/cmp"
	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/query"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
)

func query200(sd apitest.SeedData) []apitest.Table {
	ntes := make([]notebus.Note, 0, len(sd.Admins[0].Notes)+len(sd.Users[0].Notes))
	ntes = append(ntes, sd.Admins[0].Notes...)
	ntes = append(ntes, sd.Users[0].Notes...)

	usrNtes := make([]notebus.Note, 0, len(sd.Users[0].Notes))
	usrNtes = append(usrNtes, sd.Users[0].Notes...)

	sort.Slice(ntes, func(i, j int) bool {
		return ntes[i].ID.String() <= ntes[j].ID.String()
	})

	sort.Slice(usrNtes, func(i, j int) bool {
		return usrNtes[i].ID.String() <= usrNtes[j].ID.String()
	})

	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        "/v1/notes?page=1&rows=10&orderBy=note_id,ASC",
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusOK,
			Method:     http.MethodGet,
			GotResp:    &query.Result[noteapp.Note]{},
			ExpResp: &query.Result[noteapp.Note]{
				Page:        1,
				RowsPerPage: 10,
				Total:       len(usrNtes),
				Items:       toAppNotes(usrNtes),
			},
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}

func query400(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "bad-query-filter",
			URL:        "/v1/notes?page=1&rows=10&type=bungalow",
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusBadRequest,
			Method:     http.MethodGet,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.InvalidArgument, "[{\"field\":\"type\",\"error\":\"invalid note type \\\"bungalow\\\"\"}]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "bad-orderby-value",
			URL:        "/v1/notes?page=1&rows=10&orderBy=ome_id,ASC",
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusBadRequest,
			Method:     http.MethodGet,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.InvalidArgument, "[{\"field\":\"order\",\"error\":\"unknown order: ome_id\"}]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}

func queryByID200(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusOK,
			Method:     http.MethodGet,
			GotResp:    &noteapp.Note{},
			ExpResp:    toAppNotePtr(sd.Users[0].Notes[0]),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
