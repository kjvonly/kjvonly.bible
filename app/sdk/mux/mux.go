// Package mux provides support to bind domain level routes
// to the application mux.
package mux

import (
	"embed"
	"net/http"

	"github.com/jmoiron/sqlx"
	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/app/sdk/authclient"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/auditbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/productbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/vproductbus"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
	"go.opentelemetry.io/otel/trace"
)

// StaticSite represents a static site to run.
type StaticSite struct {
	react      bool
	static     embed.FS
	staticDir  string
	staticPath string
}

// Options represent optional parameters.
type Options struct {
	corsOrigin []string
	sites      []StaticSite
}

// WithCORS provides configuration options for CORS.
func WithCORS(origins []string) func(opts *Options) {
	return func(opts *Options) {
		opts.corsOrigin = origins
	}
}

// WithFileServer provides configuration options for file server.
func WithFileServer(react bool, static embed.FS, dir string, path string) func(opts *Options) {
	return func(opts *Options) {
		opts.sites = append(opts.sites, StaticSite{
			react:      react,
			static:     static,
			staticDir:  dir,
			staticPath: path,
		})
	}
}

// BibleConfig contains bible service specific config.
type BibleConfig struct {
	AuthClient *authclient.Client
}

// AuthConfig contains auth service specific config.
type AuthConfig struct {
	Auth *auth.Auth
}

type BusConfig struct {
	AuditBus    *auditbus.Business
	UserBus     userbus.ExtBusiness
	ProductBus  *productbus.Business
	HomeBus     *homebus.Business
	NoteBus     *notebus.Business
	VProductBus *vproductbus.Business
}

// Config contains all the mandatory systems required by handlers.
type Config struct {
	Build       string
	Log         *logger.Logger
	DB          *sqlx.DB
	Tracer      trace.Tracer
	BusConfig   BusConfig
	BibleConfig BibleConfig
	AuthConfig  AuthConfig
}

// RouteAdder defines behavior that sets the routes to bind for an instance
// of the service.
type RouteAdder interface {
	Add(app *web.App, cfg Config)
}

// WebAPI constructs a http.Handler with all application routes bound.
func WebAPI(cfg Config, routeAdder RouteAdder, options ...func(opts *Options)) http.Handler {
	app := web.NewApp(
		cfg.Log.Info,
		cfg.Tracer,
		mid.Otel(cfg.Tracer),
		mid.Logger(cfg.Log),
		mid.Errors(cfg.Log),
		mid.Metrics(),
		mid.Panics(),
	)

	var opts Options
	for _, option := range options {
		option(&opts)
	}

	if len(opts.corsOrigin) > 0 {
		app.EnableCORS(opts.corsOrigin)
	}

	routeAdder.Add(app, cfg)

	for _, site := range opts.sites {
		if site.react {
			app.FileServerReact(site.static, site.staticDir, site.staticPath)
		} else {
			app.FileServer(site.static, site.staticDir, site.staticPath)
		}
	}

	return app
}
