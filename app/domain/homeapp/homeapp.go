// Package homeapp maintains the app layer api for the home domain.
package homeapp

import (
	"context"
	"net/http"

	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/query"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

type app struct {
	homeBus *homebus.Business
}

func newApp(homeBus *homebus.Business) *app {
	return &app{
		homeBus: homeBus,
	}
}

func (a *app) create(ctx context.Context, r *http.Request) web.Encoder {
	var app NewHome
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	nh, err := toBusNewHome(ctx, app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	hme, err := a.homeBus.Create(ctx, nh)
	if err != nil {
		return errs.Newf(errs.Internal, "create: hme[%+v]: %s", app, err)
	}

	return toAppHome(hme)
}

func (a *app) update(ctx context.Context, r *http.Request) web.Encoder {
	var app UpdateHome
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	uh, err := toBusUpdateHome(app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	hme, err := mid.GetHome(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "home missing in context: %s", err)
	}

	updUsr, err := a.homeBus.Update(ctx, hme, uh)
	if err != nil {
		return errs.Newf(errs.Internal, "update: homeID[%s] uh[%+v]: %s", hme.ID, uh, err)
	}

	return toAppHome(updUsr)
}

func (a *app) delete(ctx context.Context, _ *http.Request) web.Encoder {
	hme, err := mid.GetHome(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "homeID missing in context: %s", err)
	}

	if err := a.homeBus.Delete(ctx, hme); err != nil {
		return errs.Newf(errs.Internal, "delete: homeID[%s]: %s", hme.ID, err)
	}

	return nil
}

func (a *app) query(ctx context.Context, r *http.Request) web.Encoder {
	qp := parseQueryParams(r)

	page, err := page.Parse(qp.Page, qp.Rows)
	if err != nil {
		return errs.NewFieldErrors("page", err)
	}

	filter, err := parseFilter(qp)
	if err != nil {
		return err.(*errs.Error)
	}

	orderBy, err := order.Parse(orderByFields, qp.OrderBy, homebus.DefaultOrderBy)
	if err != nil {
		return errs.NewFieldErrors("order", err)
	}

	hmes, err := a.homeBus.Query(ctx, filter, orderBy, page)
	if err != nil {
		return errs.Newf(errs.Internal, "query: %s", err)
	}

	total, err := a.homeBus.Count(ctx, filter)
	if err != nil {
		return errs.Newf(errs.Internal, "count: %s", err)
	}

	return query.NewResult(toAppHomes(hmes), total, page)
}

func (a *app) queryByID(ctx context.Context, _ *http.Request) web.Encoder {
	hme, err := mid.GetHome(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "querybyid: %s", err)
	}

	return toAppHome(hme)
}
