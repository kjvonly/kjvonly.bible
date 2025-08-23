// Package annotapp maintains the app layer api for the annot domain.
package annotapp

import (
	"context"
	"errors"
	"net/http"

	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/query"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

type app struct {
	annotBus *annotbus.Business
}

func newApp(annotBus *annotbus.Business) *app {
	return &app{
		annotBus: annotBus,
	}
}

func (a *app) create(ctx context.Context, r *http.Request) web.Encoder {
	var app NewAnnot
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	nt, err := toBusNewAnnot(ctx, app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	ant, err := a.annotBus.Create(ctx, nt)
	if err != nil {
		if errors.As(err, &annotbus.ErrDuplicateEntry{}) {
			return errs.Newf(errs.AlreadyExists, "create: ant[%+v]: %s", app, err)
		}
		return errs.Newf(errs.Internal, "create: ant[%+v]: %s", app, err)
	}

	return toAppAnnot(ant)
}

func (a *app) update(ctx context.Context, r *http.Request) web.Encoder {
	var app UpdateAnnot
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	ua, err := toBusUpdateAnnot(app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	ant, err := mid.GetAnnot(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "annot missing in context: %s", err)
	}

	updAnt, err := a.annotBus.Update(ctx, ant, ua)
	if err != nil {
		if errors.As(err, &annotbus.ErrStaleVersion{}) {
			return errs.Newf(errs.InvalidArgument, "update: annotID[%d_%d]: %s", ant.BookID, ant.Chapter, err)
		}
		return errs.Newf(errs.Internal, "update: annotID[%d_%d] uh[%+v]: %s", ant.BookID, ant.Chapter, ua, err)
	}

	return toAppAnnot(updAnt)
}

func (a *app) delete(ctx context.Context, _ *http.Request) web.Encoder {
	ant, err := mid.GetAnnot(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "annotID missing in context: %s", err)
	}

	if err := a.annotBus.Delete(ctx, ant); err != nil {
		return errs.Newf(errs.Internal, "delete: annotID[%d_%d]: %s", ant.BookID, ant.Chapter, err)
	}

	return nil
}

// CORE NOTE: We override or set userid query param here so that only users
// can retreive their own annots from this endpoint.
func (a *app) query(ctx context.Context, r *http.Request) web.Encoder {
	qp := parseQueryParams(r)

	page, err := page.Parse(qp.Page, qp.Rows)
	if err != nil {
		return errs.NewFieldErrors("page", err)
	}

	userID, err := mid.GetUserID(ctx)
	if err != nil {
		return err.(*errs.Error)
	}

	qp.UserID = userID.String()

	filter, err := parseFilter(qp)
	if err != nil {
		return err.(*errs.Error)
	}

	orderBy, err := order.Parse(orderByFields, qp.OrderBy, annotbus.DefaultOrderBy)
	if err != nil {
		return errs.NewFieldErrors("order", err)
	}

	ntes, err := a.annotBus.Query(ctx, filter, orderBy, page)
	if err != nil {
		return errs.Newf(errs.Internal, "query: %s", err)
	}

	total, err := a.annotBus.Count(ctx, filter)
	if err != nil {
		return errs.Newf(errs.Internal, "count: %s", err)
	}

	ntess := toAppAnnots(ntes)
	return query.NewResult(ntess, total, page)
}

func (a *app) queryByID(ctx context.Context, _ *http.Request) web.Encoder {
	ant, err := mid.GetAnnot(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "querybyid: %s", err)
	}

	return toAppAnnot(ant)
}
