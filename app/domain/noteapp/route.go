package noteapp

import (
	"net/http"

	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/app/sdk/authclient"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

// Config contains all the mandatory systems required by handlers.
type Config struct {
	Log        *logger.Logger
	NoteBus    *notebus.Business
	AuthClient *authclient.Client
}

// Routes adds specific routes for this group.
func Routes(app *web.App, cfg Config) {
	const version = "v1"

	authen := mid.Authenticate(cfg.AuthClient)
	ruleAny := mid.Authorize(cfg.AuthClient, auth.RuleAny)
	ruleUserOnly := mid.Authorize(cfg.AuthClient, auth.RuleUserOnly)
	ruleAuthorizeNote := mid.AuthorizeNote(cfg.AuthClient, cfg.NoteBus)

	api := newApp(cfg.NoteBus)

	app.HandlerFunc(http.MethodGet, version, "/notes", api.query, authen, ruleAny)
	app.HandlerFunc(http.MethodGet, version, "/notes/{note_id}", api.queryByID, authen, ruleAuthorizeNote)
	app.HandlerFunc(http.MethodPost, version, "/notes", api.create, authen, ruleUserOnly)
	app.HandlerFunc(http.MethodPut, version, "/notes/{note_id}", api.update, authen, ruleAuthorizeNote)
	app.HandlerFunc(http.MethodDelete, version, "/notes/{note_id}", api.delete, authen, ruleAuthorizeNote)
}
