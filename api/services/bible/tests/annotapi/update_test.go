package annot_test

import (
	"fmt"
	"net/http"

	"github.com/google/go-cmp/cmp"
	"github.com/kjvonly/kjvonly.bible/app/domain/annotapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
)

func update200(sd apitest.SeedData) []apitest.Table {
	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        fmt.Sprintf("/v1/annots/%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusOK,
			Input: &annotapp.UpdateAnnot{
				Annots: annotapp.Annots{
					16: {
						1: {
							Class: []string{"bga"},
						},
					},
				},
				Version: 2,
			},
			GotResp: &annotapp.Annot{},
			ExpResp: &annotapp.Annot{
				UserID:          sd.Users[0].ID.String(),
				ReferenceVector: fmt.Sprintf("%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
				Version:         2,
				DateCreated:     sd.Users[0].Annots[0].DateCreated.Unix(),
				DateUpdated:     sd.Users[0].Annots[0].DateCreated.Unix(),
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(*annotapp.Annot)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(*annotapp.Annot)
				expResp.Annots = gotResp.Annots
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
			URL:        fmt.Sprintf("/v1/annots/%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
			Token:      sd.Users[0].Token,
			Method:     http.MethodPut,
			StatusCode: http.StatusBadRequest,
			Input: &annotapp.UpdateAnnot{
				Annots: annotapp.Annots{
					16: {
						1: {
							Class: []string{"bga"},
						},
						2: {
							Class: []string{"bga"},
						},
					},
				},
			},
			GotResp: &errs.Error{},
			// Running this test individually would result in a different error message since version nubmer would be updated in a previous test.
			// This is informative in prod so going to keep the message format.
			ExpResp: errs.Newf(errs.InvalidArgument, `update: annotID[50_3]: trying to update stale version. Current version is 2 but trying to update to 0`),
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
			URL:        fmt.Sprintf("/v1/annots/%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
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
			URL:        fmt.Sprintf("/v1/annots/%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
			Token:      sd.Users[0].Token + "A",
			Method:     http.MethodPut,
			StatusCode: http.StatusUnauthorized,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.Unauthenticated, "authentication failed : bindings results[[{[true] map[x:false]}]] ok[true]"),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
