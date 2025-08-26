// Package noteapp maintains the app layer api for the note domain.
package noteapp

import (
	"context"
	"net/http"
	"time"

	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/app/sdk/mid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/query"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

type app struct {
	noteBus *notebus.Business
}

func newApp(noteBus *notebus.Business) *app {
	return &app{
		noteBus: noteBus,
	}
}

func (a *app) create(ctx context.Context, r *http.Request) web.Encoder {
	var app NewNote
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	nt, err := toBusNewNote(ctx, app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	nte, err := a.noteBus.Create(ctx, nt)
	if err != nil {
		return errs.Newf(errs.Internal, "create: nte[%+v]: %s", app, err)
	}

	return toAppNote(nte)
}

func (a *app) update(ctx context.Context, r *http.Request) web.Encoder {
	var app UpdateNote
	if err := web.Decode(r, &app); err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	uh, err := toBusUpdateNote(app)
	if err != nil {
		return errs.New(errs.InvalidArgument, err)
	}

	nte, err := mid.GetNote(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "note missing in context: %s", err)
	}

	updNte, err := a.noteBus.Update(ctx, nte, uh)
	if err != nil {
		return errs.Newf(errs.Internal, "update: noteID[%s] uh[%+v]: %s", nte.ID, uh, err)
	}

	return toAppNote(updNte)
}

func (a *app) delete(ctx context.Context, _ *http.Request) web.Encoder {
	nte, err := mid.GetNote(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "noteID missing in context: %s", err)
	}

	softDelete := notebus.Note{}
	softDelete.ID = nte.ID
	softDelete.UserID = nte.UserID
	softDelete.DateCreated = nte.DateCreated
	softDelete.DateUpdated = nte.DateUpdated
	softDelete.DateDeleted = time.Now()
	softDelete.Version = -1

	updNte, err := a.noteBus.Update(ctx, softDelete, notebus.UpdateNote{})
	if err != nil {
		return errs.Newf(errs.Internal, "delete: noteID[%s]: %s", nte.ID, err)
	}

	return toAppNote(updNte)
}

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

	orderBy, err := order.Parse(orderByFields, qp.OrderBy, notebus.DefaultOrderBy)
	if err != nil {
		return errs.NewFieldErrors("order", err)
	}

	ntes, err := a.noteBus.Query(ctx, filter, orderBy, page)
	if err != nil {
		return errs.Newf(errs.Internal, "query: %s", err)
	}

	total, err := a.noteBus.Count(ctx, filter)
	if err != nil {
		return errs.Newf(errs.Internal, "count: %s", err)
	}

	ntess := toAppNotes(ntes)
	return query.NewResult(ntess, total, page)
}

func (a *app) queryByID(ctx context.Context, _ *http.Request) web.Encoder {
	nte, err := mid.GetNote(ctx)
	if err != nil {
		return errs.Newf(errs.Internal, "querybyid: %s", err)
	}

	return toAppNote(nte)
}
