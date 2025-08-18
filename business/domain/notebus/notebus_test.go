package notebus_test

import (
	"context"
	"fmt"
	"sort"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/dbtest"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/business/sdk/unitest"
	"github.com/kjvonly/kjvonly.bible/business/types/role"
)

func Test_Note(t *testing.T) {
	t.Parallel()

	db := dbtest.New(t, "Test_Note")

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

	ntes, err := notebus.TestGenerateSeedNotes(ctx, 2, busDomain.Note, usrs[0].ID)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding notes : %w", err)
	}

	tu1 := unitest.User{
		User:  usrs[0],
		Notes: ntes,
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

	ntes, err = notebus.TestGenerateSeedNotes(ctx, 2, busDomain.Note, usrs[0].ID)
	if err != nil {
		return unitest.SeedData{}, fmt.Errorf("seeding notes : %w", err)
	}

	tu3 := unitest.User{
		User:  usrs[0],
		Notes: ntes,
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
	ntes := make([]notebus.Note, 0, len(sd.Admins[0].Notes)+len(sd.Users[0].Notes))
	ntes = append(ntes, sd.Admins[0].Notes...)
	ntes = append(ntes, sd.Users[0].Notes...)

	sort.Slice(ntes, func(i, j int) bool {
		return ntes[i].ID.String() <= ntes[j].ID.String()
	})

	table := []unitest.Table{
		{
			Name:    "all",
			ExpResp: ntes,
			ExcFunc: func(ctx context.Context) any {
				resp, err := busDomain.Note.Query(ctx, notebus.QueryFilter{}, notebus.DefaultOrderBy, page.MustParse("1", "10"))
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.([]notebus.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.([]notebus.Note)

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
			ExpResp: sd.Users[0].Notes[0],
			ExcFunc: func(ctx context.Context) any {
				resp, err := busDomain.Note.QueryByID(ctx, sd.Users[0].Notes[0].ID)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(notebus.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(notebus.Note)

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
			ExpResp: notebus.Note{
				UserID: sd.Users[0].ID,
				Tags: []notebus.Tag{
					{
						ID: uuid.UUID{},
					},
				},
			},
			ExcFunc: func(ctx context.Context) any {
				nh := notebus.NewNote{
					UserID: sd.Users[0].ID,
					Tags: []notebus.Tag{
						{
							ID: uuid.UUID{},
						},
					},
				}

				resp, err := busDomain.Note.Create(ctx, nh)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(notebus.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(notebus.Note)

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
			ExpResp: notebus.Note{
				ID:        sd.Users[0].Notes[0].ID,
				UserID:    sd.Users[0].ID,
				BookID:    0,
				Chapter:   0,
				Verse:     0,
				WordIndex: 0,
				Tags: []notebus.Tag{
					{
						ID:  uuid.UUID{},
						Tag: "ABC",
					},
				},
				Version:     2,
				DateCreated: sd.Users[0].Notes[0].DateCreated,
				DateUpdated: sd.Users[0].Notes[0].DateCreated,
			},
			ExcFunc: func(ctx context.Context) any {
				uh := notebus.UpdateNote{
					Version: 2,
					Tags: []notebus.Tag{
						{
							ID:  uuid.UUID{},
							Tag: "ABC",
						},
					},
				}

				resp, err := busDomain.Note.Update(ctx, sd.Users[0].Notes[0], uh)
				if err != nil {
					return err
				}

				return resp
			},
			CmpFunc: func(got any, exp any) string {
				gotResp, exists := got.(notebus.Note)
				if !exists {
					return "error occurred"
				}

				expResp := exp.(notebus.Note)

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
				if err := busDomain.Note.Delete(ctx, sd.Users[0].Notes[1]); err != nil {
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
				if err := busDomain.Note.Delete(ctx, sd.Admins[0].Notes[1]); err != nil {
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
