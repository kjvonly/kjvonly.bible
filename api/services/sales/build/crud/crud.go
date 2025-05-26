// Package crud binds the crud domain set of routes into the specified app.
package crud

import (
	"github.com/kjvonly/kjvonly.bible/app/domain/auditapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/checkapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/homeapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/productapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/tranapp"
	"github.com/kjvonly/kjvonly.bible/app/domain/userapp"
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
		HomeBus:    cfg.BusConfig.HomeBus,
		AuthClient: cfg.SalesConfig.AuthClient,
	})

	productapp.Routes(app, productapp.Config{
		ProductBus: cfg.BusConfig.ProductBus,
		AuthClient: cfg.SalesConfig.AuthClient,
	})

	tranapp.Routes(app, tranapp.Config{
		UserBus:    cfg.BusConfig.UserBus,
		ProductBus: cfg.BusConfig.ProductBus,
		Log:        cfg.Log,
		AuthClient: cfg.SalesConfig.AuthClient,
		DB:         cfg.DB,
	})

	userapp.Routes(app, userapp.Config{
		UserBus:    cfg.BusConfig.UserBus,
		AuthClient: cfg.SalesConfig.AuthClient,
	})

	auditapp.Routes(app, auditapp.Config{
		Log:        cfg.Log,
		AuditBus:   cfg.BusConfig.AuditBus,
		AuthClient: cfg.SalesConfig.AuthClient,
	})
}
