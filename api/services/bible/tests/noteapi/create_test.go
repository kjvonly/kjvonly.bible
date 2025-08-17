package note_test

import (
	"net/http"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/app/domain/noteapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
)

func create200(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        "/v1/notes",
			Token:      sd.Users[0].Token,
			Method:     http.MethodPost,
			StatusCode: http.StatusOK,
			Input: &noteapp.NewNote{
				ChapterKey: "0_0_0_0",
				Title:      "Chirst is King",
				Html:       "<h1>Christ is King!</h1>",
				Text:       "Christ is King!",
				Tags: []noteapp.Tag{
					{
						ID:          uuid.UUID{}.String(),
						Tag:         "Jesus",
						DateCreated: time.Now().Unix(),
					},
				},
			},
			GotResp: &noteapp.Note{},
			ExpResp: &noteapp.Note{
				UserID:     sd.Users[0].ID.String(),
				ChapterKey: "0_0_0_0",
				Title:      "Chirst is King",
				Html:       "<h1>Christ is King!</h1>",
				Text:       "Christ is King!",
				Tags: []noteapp.Tag{
					{
						ID:          uuid.UUID{}.String(),
						Tag:         "Jesus",
						DateCreated: time.Now().Unix(),
					},
				},
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

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func create400(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "missing-input",
			URL:        "/v1/notes",
			Token:      sd.Users[0].Token,
			Method:     http.MethodPost,
			StatusCode: http.StatusBadRequest,
			Input:      &noteapp.NewNote{},
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.InvalidArgument, `validate: [{"field":"chapter_key","error":"chapter_key is a required field"},{"field":"title","error":"title is a required field"},{"field":"html","error":"html is a required field"},{"field":"text","error":"text is a required field"}]`),

			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}

func create401(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "emptytoken",
			URL:        "/v1/notes",
			Token:      "&nbsp;",
			Method:     http.MethodPost,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "error parsing token: token contains an invalid number of segments"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "badtoken",
			URL:        "/v1/notes",
			Token:      sd.Admins[0].Token[:10],
			Method:     http.MethodPost,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "error parsing token: token contains an invalid number of segments"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "badsig",
			URL:        "/v1/notes",
			Token:      sd.Admins[0].Token + "A",
			Method:     http.MethodPost,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authentication failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "wronguser",
			URL:        "/v1/notes",
			Token:      sd.Admins[0].Token,
			Method:     http.MethodPost,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authorize: you are not authorized for that action, claims[[ADMIN]] rule[rule_user_only]: rego evaluation failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
