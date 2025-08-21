package annot_test

import (
	"context"
	"fmt"

	"github.com/kjvonly/kjvonly.bible/app/sdk/apitest"
	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/dbtest"
	"github.com/kjvonly/kjvonly.bible/business/types/role"
)

func insertSeedData(db *dbtest.Database, ath *auth.Auth) (apitest.SeedData, error) {
	ctx := context.Background()
	busDomain := db.BusDomain

	usrs, err := userbus.TestSeedUsers(ctx, 1, role.User, busDomain.User)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	ants, err := annotbus.TestGenerateSeedAnnots(ctx, 2, busDomain.Annot, usrs[0].ID)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding annots : %w", err)
	}

	tu1 := apitest.User{
		User:   usrs[0],
		Annots: ants,
		Token:  apitest.Token(db.BusDomain.User, ath, usrs[0].Email.Address),
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.User, busDomain.User)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	tu2 := apitest.User{
		User:  usrs[0],
		Token: apitest.Token(db.BusDomain.User, ath, usrs[0].Email.Address),
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.Admin, busDomain.User)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	ants, err = annotbus.TestGenerateSeedAnnots(ctx, 2, busDomain.Annot, usrs[0].ID)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding annots : %w", err)
	}

	tu3 := apitest.User{
		User:   usrs[0],
		Annots: ants,
		Token:  apitest.Token(db.BusDomain.User, ath, usrs[0].Email.Address),
	}

	// -------------------------------------------------------------------------

	usrs, err = userbus.TestSeedUsers(ctx, 1, role.Admin, busDomain.User)
	if err != nil {
		return apitest.SeedData{}, fmt.Errorf("seeding users : %w", err)
	}

	tu4 := apitest.User{
		User:  usrs[0],
		Token: apitest.Token(db.BusDomain.User, ath, usrs[0].Email.Address),
	}

	// -------------------------------------------------------------------------

	sd := apitest.SeedData{
		Users:  []apitest.User{tu1, tu2},
		Admins: []apitest.User{tu3, tu4},
	}

	return sd, nil
}
