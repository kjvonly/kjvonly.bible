package apitest

import (
	"net/http/httptest"
	"testing"

	authbuild "github.com/kjvonly/kjvonly.bible/api/services/auth/build/all"
	biblebuild "github.com/kjvonly/kjvonly.bible/api/services/bible/build/all"
	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/app/sdk/authclient"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mux"
	"github.com/kjvonly/kjvonly.bible/business/sdk/dbtest"
)

// New initialized the system to run a test.
func New(t *testing.T, testName string) *Test {
	db := dbtest.New(t, testName)

	// -------------------------------------------------------------------------

	auth, err := auth.New(auth.Config{
		Log:       db.Log,
		UserBus:   db.BusDomain.User,
		KeyLookup: &KeyStore{},
	})
	if err != nil {
		t.Fatal(err)
	}

	// -------------------------------------------------------------------------

	server := httptest.NewServer(mux.WebAPI(mux.Config{
		Log: db.Log,
		DB:  db.DB,
		BusConfig: mux.BusConfig{
			UserBus: db.BusDomain.User,
		},
		AuthConfig: mux.AuthConfig{
			Auth: auth,
		},
	}, authbuild.Routes()))

	authClient := authclient.New(db.Log, server.URL)

	// -------------------------------------------------------------------------

	mux := mux.WebAPI(mux.Config{
		Log: db.Log,
		DB:  db.DB,
		BusConfig: mux.BusConfig{
			AuditBus:    db.BusDomain.Audit,
			UserBus:     db.BusDomain.User,
			ProductBus:  db.BusDomain.Product,
			HomeBus:     db.BusDomain.Home,
			VProductBus: db.BusDomain.VProduct,
		},
		BibleConfig: mux.BibleConfig{
			AuthClient: authClient,
		},
	}, biblebuild.Routes())

	return &Test{
		DB:   db,
		Auth: auth,
		mux:  mux,
	}
}
