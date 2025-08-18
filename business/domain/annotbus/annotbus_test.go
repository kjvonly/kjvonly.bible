package annotbus_test

import (
	"context"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/dbtest"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/business/sdk/unitest"
	"github.com/kjvonly/kjvonly.bible/business/types/role"
)

func Test_Annot(t *testing.T) {
	t.Parallel()

	db := dbtest.New(t, "Test_Annot")

	sd, err := insertSeedData(db.BusDomain)
	if err != nil {
		t.Fatalf("Seeding error: %s", err)
	}

	// -------------------------------------------------------------------------

	unitest.Run(t, query(db.BusDomain, sd), "query")
	unitest.Run(t, create(db.BusDomain, sd), "create")
	unitest.Run(t, update(db.BusDomain, sd), "update")
	unitest.Run(t, delete(db.BusDomain, sd), "delete")
}

// =============================================================================

func insertSeedData(busDomain dbtest.BusDomain) (unitest.SeedData, error) {
	ctx := context.Background()

	usrs, err := userbus.TestSeedUsers(ctx, 1, role.User, busDomain.User)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	ants, err := annotbus.TestGenerateSeedAnnots(ctx, 2, busDomain.Annot, usrs[0].ID)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding annots : %w", err)
	}

	tu1 := unitest.User{
		User:   usrs[0],
		Annots: ants,
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.User, busDomain.User)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	tu2 := unitest.User{
		User: usrs[0],
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.Admin, busDomain.User)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	ants, err = annotbus.TestGenerateSeedAnnots(ctx, 2, busDomain.Annot, usrs[0].ID)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding annots : %w", err)
	}

	tu3 := unitest.User{
		User:   usrs[0],
		Annots: ants,
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.Admin, busDomain.User)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	tu4 := unitest.User{
		User: usrs[0],
	}

	// -------------------------------------------------------------------------

	sd := unitest.SeedData{
		Users:  []unitest.User{tu1, tu2},
		Admins: []unitest.User{tu3, tu4},
	}

	return sd, nil
}

// =============================================================================

func query(busDomain dbtest.BusDomain, sd unitest.SeedData) []unitest.Table {
	ants := make([]annotbus.Annot, 0, len(sd.Admins[0].Annots)+len(sd.Users[0].Annots))
	ants = append(ants, sd.Admins[0].Annots...)
	ants = append(ants, sd.Users[0].Annots...)

	sort.Slice(ants, func(i, j int) bool {
		return ants[i].ID.String() <= ants[j].ID.String()
	})

	table := []unitest.Table{
		{
			Name:    "all",
			ExpResp: ants,
			ExcFunc: func(ctx context.Context) any {
				resp, err := busDomain.Annot.Query(ctx, annotbus.QueryFilter{}, annotbus.DefaultOrderBy, page.MustParse("1", "10"))
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.([]annotbus.Annot)
				if !exists {
					return "error occurred"
				}

				expResp := exp.([]annotbus.Annot)

				for i := range gotResp {
					if gotResp[i].DateCreated.Format(time.RFC3339) == expResp[i].DateCreated.Format(time.RFC3339) {
						expResp[i].DateCreated = gotResp[i].DateCreated
					}

					if gotResp[i].DateUpdated.Format(time.RFC3339) == expResp[i].DateUpdated.Format(time.RFC3339) {
						expResp[i].DateUpdated = gotResp[i].DateUpdated
					}
				}

				return cmp.Diff(gotResp, expResp)
			},
		},
		{
			Name:    "byid",
			ExpResp: sd.Users[0].Annots[0],
			ExcFunc: func(ctx context.Context) any {
				resp, err := busDomain.Annot.QueryByID(ctx, sd.Users[0].Annots[0].ID)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(annotbus.Annot)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(annotbus.Annot)

				if gotResp.DateCreated.Format(time.RFC3339) == expResp.DateCreated.Format(time.RFC3339) {
					expResp.DateCreated = gotResp.DateCreated
				}

				if gotResp.DateUpdated.Format(time.RFC3339) == expResp.DateUpdated.Format(time.RFC3339) {
					expResp.DateUpdated = gotResp.DateUpdated
				}

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func create(busDomain dbtest.BusDomain, sd unitest.SeedData) []unitest.Table {
	table := []unitest.Table{
		{
			Name: "basic",
			ExpResp: annotbus.Annot{
				UserID: sd.Users[0].ID,
				Tags: []annotbus.Tag{
					{
						ID: uuid.UUID{},
					},
				},
			},
			ExcFunc: func(ctx context.Context) any {
				nh := annotbus.NewAnnot{
					UserID: sd.Users[0].ID,
					Tags: []annotbus.Tag{
						{
							ID: uuid.UUID{},
						},
					},
				}

				resp, err := busDomain.Annot.Create(ctx, nh)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(annotbus.Annot)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(annotbus.Annot)

				expResp.ID = gotResp.ID
				expResp.DateCreated = gotResp.DateCreated
				expResp.DateUpdated = gotResp.DateUpdated

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func update(busDomain dbtest.BusDomain, sd unitest.SeedData) []unitest.Table {
	table := []unitest.Table{
		{
			Name: "basic",
			ExpResp: annotbus.Annot{
				ID:        sd.Users[0].Annots[0].ID,
				UserID:    sd.Users[0].ID,
				BookID:    0,
				Chapter:   0,
				Verse:     0,
				WordIndex: 0,
				Tags: []annotbus.Tag{
					{
						ID:  uuid.UUID{},
						Tag: "ABC",
					},
				},
				Version:     2,
				DateCreated: sd.Users[0].Annots[0].DateCreated,
				DateUpdated: sd.Users[0].Annots[0].DateCreated,
			},
			ExcFunc: func(ctx context.Context) any {
				uh := annotbus.UpdateAnnot{
					Version: 2,
					Tags: []annotbus.Tag{
						{
							ID:  uuid.UUID{},
							Tag: "ABC",
						},
					},
				}

				resp, err := busDomain.Annot.Update(ctx, sd.Users[0].Annots[0], uh)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(annotbus.Annot)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(annotbus.Annot)

				expResp.DateUpdated = gotResp.DateUpdated

				return cmp.Diff(gotResp, expResp)
			},
		},
	}

	return table
}

func delete(busDomain dbtest.BusDomain, sd unitest.SeedData) []unitest.Table {
	table := []unitest.Table{
		{
			Name:    "user",
			ExpResp: nil,
			ExcFunc: func(ctx context.Context) any {
				if err := busDomain.Annot.Delete(ctx, sd.Users[0].Annots[1]); err != nil {
					return err
				}

				return nil
			},
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
		{
			Name:    "admin",
			ExpResp: nil,
			ExcFunc: func(ctx context.Context) any {
				if err := busDomain.Annot.Delete(ctx, sd.Admins[0].Annots[1]); err != nil {
					return err
				}

				return nil
			},
			CmpFunc: func(got any, exp any) string {
				return cmp.Diff(got, exp)
			},
		},
	}

	return table
}
