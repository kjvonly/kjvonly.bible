package annot_test

import (
	"fmt"
	"net/http"
	"sort"

	"github.com/google/go-cmp/cmp"
	"github.com/kjvonly/kjvonly.bible/app/domain/annotapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/query"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
)

func query200(sd apitest.SeedData) []apitest.Table {
	ants := make([]annotbus.Annot, 0, len(sd.Admins[0].Annots)+len(sd.Users[0].Annots))
	ants = append(ants, sd.Admins[0].Annots...)
	ants = append(ants, sd.Users[0].Annots...)

	usrAnts := make([]annotbus.Annot, 0, len(sd.Users[0].Annots))
	usrAnts = append(usrAnts, sd.Users[0].Annots...)

	sort.Slice(ants, func(i, j int) bool {
		return ants[i].BookID*1000+ants[i].Chapter <= ants[j].BookID*1000+ants[j].Chapter
	})

	sort.Slice(usrAnts, func(i, j int) bool {
		return usrAnts[i].BookID*1000+usrAnts[i].Chapter <= usrAnts[j].BookID*1000+usrAnts[j].Chapter

	})

	table := []apitest.Table{
		{
			Name:       "basic",
			URL:        "/v1/annots?page=1&rows=10&orderBy=annot_id,ASC",
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusOK,
			Method:     http.MethodGet,
			GotResp:    &query.Result[annotapp.Annot]{},
			ExpResp: &query.Result[annotapp.Annot]{
				Page:        1,
				RowsPerPage: 10,
				Total:       len(usrAnts),
				Items:       toAppAnnots(usrAnts),
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
			URL:        "/v1/annots?page=1&rows=10&annot_id=0000-00000",
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusBadRequest,
			Method:     http.MethodGet,
			GotResp:    &errs.Error{},
			ExpResp:    errs.Newf(errs.InvalidArgument, `[{"field":"annot_id","error":"invalid UUID length: 10"}]`),

			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:       "bad-orderby-value",
			URL:        "/v1/annots?page=1&rows=10&orderBy=ome_id,ASC",
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
			URL:        fmt.Sprintf("/v1/annots/%d_%d", sd.Users[0].Annots[0].BookID, sd.Users[0].Annots[0].Chapter),
			Token:      sd.Users[0].Token,
			StatusCode: http.StatusOK,
			Method:     http.MethodGet,
			GotResp:    &annotapp.Annot{},
			ExpResp:    toAppAnnotPtr(sd.Users[0].Annots[0]),
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
