// Package all binds all the routes into the specified app.
package all

import (
	"github.com/kjvonly/kjvonly.bible/app/domain/auditapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/checkapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/homeapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/productapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/rawapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/tranapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/userapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/vproductapp"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mux"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

// Routes constructs the add value which provides the implementation of
// of RouteAdder for specifying what routes to bind to this instance.
func Routes() add {
	return add{}
}

type add struct{}

// Add implements the RouterAdder interface.
func (add) Add(app *web.App, cfg mux.Config) {
	checkapp.Routes(app, checkapp.Config{
		Build: cfg.Build,
		Log:   cfg.Log,
		DB:    cfg.DB,
	})

	homeapp.Routes(app, homeapp.Config{
		Log:        cfg.Log,
		HomeBus:    cfg.BusConfig.HomeBus,
		AuthClient: cfg.BibleConfig.AuthClient,
	})

	productapp.Routes(app, productapp.Config{
		Log:        cfg.Log,
		ProductBus: cfg.BusConfig.ProductBus,
		AuthClient: cfg.BibleConfig.AuthClient,
	})

	rawapp.Routes(app)

	tranapp.Routes(app, tranapp.Config{
		Log:        cfg.Log,
		DB:         cfg.DB,
		UserBus:    cfg.BusConfig.UserBus,
		ProductBus: cfg.BusConfig.ProductBus,
		AuthClient: cfg.BibleConfig.AuthClient,
	})

	userapp.Routes(app, userapp.Config{
		Log:        cfg.Log,
		UserBus:    cfg.BusConfig.UserBus,
		AuthClient: cfg.BibleConfig.AuthClient,
	})

	auditapp.Routes(app, auditapp.Config{
		Log:        cfg.Log,
		AuditBus:   cfg.BusConfig.AuditBus,
		AuthClient: cfg.BibleConfig.AuthClient,
	})

	vproductapp.Routes(app, vproductapp.Config{
		Log:         cfg.Log,
		UserBus:     cfg.BusConfig.UserBus,
		VProductBus: cfg.BusConfig.VProductBus,
		AuthClient:  cfg.BibleConfig.AuthClient,
	})
}
