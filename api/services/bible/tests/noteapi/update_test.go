package note_test

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/business/sdk/dbtest"
)

func update200(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusOK,
			Input: &noteapp.UpdateNote{
				Type: dbtest.StringPointer("private"),
			},
			GotResp: &noteapp.Note{},
			ExpResp: &noteapp.Note{
				ID:          sd.Users[0].Notes[0].ID.String(),
				UserID:      sd.Users[0].ID.String(),
				Type:        "private",
				DateCreated: sd.Users[0].Notes[0].DateCreated.Unix(),
				DateUpdated: sd.Users[0].Notes[0].DateCreated.Unix(),
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(*noteapp.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(*noteapp.Note)
				expResp.Tags = gotResp.Tags
				gotResp.DateUpdated = expResp.DateUpdated

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func update400(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "bad-input",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusBadRequest,
			Input: &noteapp.UpdateNote{
				Tags: []noteapp.Tag{
					{ID: "000", Tag: "tag", DateCreated: time.Now().Unix()},
				},
			},
			GotResp: &errs.Error{},
			ExpResp: errs.Newf(errs.InvalidArgument, `validate: [{"field":"id","error":"id must be a valid UUID"}]`),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "bad-type",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusBadRequest,
			Input: &noteapp.UpdateNote{
				Type: dbtest.StringPointer("BAD TYPE"),
			},
			GotResp: &errs.Error{},
			ExpResp: errs.Newf(errs.InvalidArgument, "parse: invalid note type \"BAD TYPE\""),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}

func update401(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "emptytoken",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      "&nbsp;",
			Method:     http.MethodPut,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "error parsing token: token contains an invalid number of segments"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "badsig",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Users[0].Notes[0].ID),
			Token:      sd.Users[0].Token + "A",
			Method:     http.MethodPut,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authentication failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "wronguser",
			URL:        fmt.Sprintf("/v1/notes/%s", sd.Admins[0].Notes[0].ID),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusUnauthorized,
			Input: &noteapp.UpdateNote{
				Type: dbtest.StringPointer("shared"),
			},
			GotResp: &errs.Error{},
			ExpResp: errs.Newf(errs.Unauthenticated, "authorize: you are not authorized for that action, claims[[USER]] rule[rule_admin_or_subject]: rego evaluation failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
