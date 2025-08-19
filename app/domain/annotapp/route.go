package annotapp

import (
	"net/http"

	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/app/sdk/authclient"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

// Config contains all the mandatory systems required by handlers.
type Config struct {
	Log        *logger.Logger
	AnnotBus   *annotbus.Business
	AuthClient *authclient.Client
}

// Routes adds specific routes for this group.
func Routes(app *web.App, cfg Config) {
	const version = "v1"

	authen := mid.Authenticate(cfg.AuthClient)
	ruleAny := mid.Authorize(cfg.AuthClient, auth.RuleAny)
	ruleUserOnly := mid.Authorize(cfg.AuthClient, auth.RuleUserOnly)
	ruleAuthorizeAnnot := mid.AuthorizeAnnot(cfg.AuthClient, cfg.AnnotBus)

	api := newApp(cfg.AnnotBus)

	app.HandlerFunc(http.MethodGet, version, "/annots", api.query, authen, ruleAny)
	app.HandlerFunc(http.MethodGet, version, "/annots/{annot_id}", api.queryByID, authen, ruleAuthorizeAnnot)
	app.HandlerFunc(http.MethodPost, version, "/annots", api.create, authen, ruleUserOnly)
	app.HandlerFunc(http.MethodPut, version, "/annots/{annot_id}", api.update, authen, ruleAuthorizeAnnot)
	app.HandlerFunc(http.MethodDelete, version, "/annots/{annot_id}", api.delete, authen, ruleAuthorizeAnnot)
}
