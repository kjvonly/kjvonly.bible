package note_test

import (
	"fmt"
	"net/http"

	"github.com/google/go-cmp/cmp"
	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
)

func delete200(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "asuser",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			Method:     http.MethodDelete,
			StatusCode: http.StatusOK,
			GotResp:    &noteapp.Note{},
			ExpResp: &noteapp.Note{
				UserID:          sd.Users[0].ID.String(),
				Version:         0,
				ReferenceVector: "0_0_0_0",
				Tags:            []noteapp.Tag{},
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(*noteapp.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(*noteapp.Note)

				expResp.ID = gotResp.ID

				expResp.DateCreated = gotResp.DateCreated
				expResp.DateUpdated = gotResp.DateUpdated
				expResp.DateDeleted = gotResp.DateDeleted

				return cmp.Diff(gotResp, expResp)
			},
		},
		{
			Name:       "asadmin",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Admins[0].Notes[0].ID),
			Token:      sd.Admins[0].Token,
			Method:     http.MethodDelete,
			StatusCode: http.StatusOK,
			GotResp:    &noteapp.Note{},
			ExpResp: &noteapp.Note{
				UserID:          sd.Admins[0].ID.String(),
				Version:         0,
				ReferenceVector: "0_0_0_0",
				Tags:            []noteapp.Tag{},
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(*noteapp.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(*noteapp.Note)

				expResp.ID = gotResp.ID

				expResp.DateCreated = gotResp.DateCreated
				expResp.DateUpdated = gotResp.DateUpdated
				expResp.DateDeleted = gotResp.DateDeleted

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func delete401(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "emptytoken",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[1].ID),
			Token:      "&nbsp;",
			Method:     http.MethodDelete,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "error parsing token: token contains an invalid number of segments"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "badsig",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[1].ID),
			Token:      sd.Users[0].Token + "A",
			Method:     http.MethodDelete,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authentication failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "wronguser",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[1].ID),
			Token:      sd.Users[1].Token,
			Method:     http.MethodDelete,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authorize: you are not authorized for that action, claims[[USER]] rule[rule_admin_or_subject]: rego evaluation failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
