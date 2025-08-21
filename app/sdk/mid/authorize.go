package mid

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/app/sdk/auth"
	"github.com/kjvonly/kjvonly.bible/app/sdk/authclient"
	"github.com/kjvonly/kjvonly.bible/app/sdk/errs"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/productbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/foundation/web"
)

// ErrInvalidID represents a condition where the id is not a uuid.
var ErrInvalidID = errors.New("ID is not in its proper form")
var ErrInvalidUserID = errors.New("UserID is not retrievable ")

// Authorize validates authorization via the auth service.
func Authorize(client *authclient.Client, rule string) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			userID, err := GetUserID(ctx)
			if err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			auth := authclient.Authorize{
				Claims: GetClaims(ctx),
				UserID: userID,
				Rule:   rule,
			}

			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()

			if err := client.Authorize(ctx, auth); err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}

// AuthorizeUser executes the specified role and extracts the specified
// user from the DB if a user id is specified in the call. Depending on the rule
// specified, the userid from the claims may be compared with the specified
// user id.
func AuthorizeUser(client *authclient.Client, userBus userbus.ExtBusiness, rule string) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			id := web.Param(r, "user_id")

			var userID uuid.UUID

			if id != "" {
				var err error
				userID, err = uuid.Parse(id)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				usr, err := userBus.QueryByID(ctx, userID)
				if err != nil {
					switch {
					case errors.Is(err, userbus.ErrNotFound):
						return errs.New(errs.Unauthenticated, err)
					default:
						return errs.Newf(errs.Unauthenticated, "querybyid: userID[%s]: %s", userID, err)
					}
				}

				ctx = setUser(ctx, usr)
			}

			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()

			auth := authclient.Authorize{
				Claims: GetClaims(ctx),
				UserID: userID,
				Rule:   rule,
			}

			if err := client.Authorize(ctx, auth); err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}

// AuthorizeProduct executes the specified role and extracts the specified
// product from the DB if a product id is specified in the call. Depending on
// the rule specified, the userid from the claims may be compared with the
// specified user id from the product.
func AuthorizeProduct(client *authclient.Client, productBus *productbus.Business) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			id := web.Param(r, "product_id")

			var userID uuid.UUID

			if id != "" {
				var err error
				productID, err := uuid.Parse(id)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				prd, err := productBus.QueryByID(ctx, productID)
				if err != nil {
					switch {
					case errors.Is(err, productbus.ErrNotFound):
						return errs.New(errs.Unauthenticated, err)
					default:
						return errs.Newf(errs.Internal, "querybyid: productID[%s]: %s", productID, err)
					}
				}

				userID = prd.UserID
				ctx = setProduct(ctx, prd)
			}

			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()

			auth := authclient.Authorize{
				UserID: userID,
				Claims: GetClaims(ctx),
				Rule:   auth.RuleAdminOrSubject,
			}

			if err := client.Authorize(ctx, auth); err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}

// AuthorizeHome executes the specified role and extracts the specified
// home from the DB if a home id is specified in the call. Depending on
// the rule specified, the userid from the claims may be compared with the
// specified user id from the home.
func AuthorizeHome(client *authclient.Client, homeBus *homebus.Business) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			id := web.Param(r, "home_id")

			var userID uuid.UUID

			if id != "" {
				var err error
				homeID, err := uuid.Parse(id)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				hme, err := homeBus.QueryByID(ctx, homeID)
				if err != nil {
					switch {
					case errors.Is(err, homebus.ErrNotFound):
						return errs.New(errs.Unauthenticated, err)
					default:
						return errs.Newf(errs.Unauthenticated, "querybyid: homeID[%s]: %s", homeID, err)
					}
				}

				userID = hme.UserID
				ctx = setHome(ctx, hme)
			}

			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()

			auth := authclient.Authorize{
				Claims: GetClaims(ctx),
				UserID: userID,
				Rule:   auth.RuleAdminOrSubject,
			}

			if err := client.Authorize(ctx, auth); err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}

// TODO update when sharing notes is implemented.
// AuthorizeNote executes the specified role and extracts the specified
// note from the DB if a note id is specified in the call. Depending on
// the rule specified, the userid from the claims may be compared with the
// specified user id from the note.
func AuthorizeNote(client *authclient.Client, noteBus *notebus.Business) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			id := web.Param(r, "note_id")

			var userID uuid.UUID

			if id != "" {
				var err error
				noteID, err := uuid.Parse(id)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				nte, err := noteBus.QueryByID(ctx, noteID)
				if err != nil {
					switch {
					case errors.Is(err, notebus.ErrNotFound):
						return errs.New(errs.Unauthenticated, err)
					default:
						return errs.Newf(errs.Unauthenticated, "querybyid: noteID[%s]: %s", noteID, err)
					}
				}

				userID = nte.UserID
				ctx = setNote(ctx, nte)
			}

			ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()

			auth := authclient.Authorize{
				Claims: GetClaims(ctx),
				UserID: userID,
				Rule:   auth.RuleAdminOrSubject,
			}

			if err := client.Authorize(ctx, auth); err != nil {
				return errs.New(errs.Unauthenticated, err)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}

// CORE NOTE: Breaks the existing pattern of calling the auth service.
// Don't need to do that since annots are per user
// a sharedannot service could be added in the future to allow
// users to share annots with other users but would go through
// a different authorize func
func AuthorizeAnnot(client *authclient.Client, annotBus *annotbus.Business) web.MidFunc {
	m := func(next web.HandlerFunc) web.HandlerFunc {
		h := func(ctx context.Context, r *http.Request) web.Encoder {
			id := web.Param(r, "annot_id")

			userID, err := GetUserID(ctx)
			if err != nil {
				return errs.New(errs.Unauthenticated, ErrInvalidUserID)
			}

			if id != "" {
				var err error

				annotID := strings.Split(id, "_")

				if len(annotID) != 2 {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				bookID, err := strconv.ParseInt(annotID[0], 0, 0)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				chapter, err := strconv.ParseInt(annotID[1], 0, 0)
				if err != nil {
					return errs.New(errs.Unauthenticated, ErrInvalidID)
				}

				ant, err := annotBus.QueryByID(ctx, userID, int(bookID), int(chapter))
				if err != nil {
					switch {
					case errors.Is(err, notebus.ErrNotFound):
						return errs.New(errs.Unauthenticated, err)
					default:
						return errs.Newf(errs.Unauthenticated, "querybyid: bookID[%d] chapter[%d]: %s", bookID, chapter, err)
					}
				}

				ctx = setAnnot(ctx, ant)
			}

			return next(ctx, r)
		}

		return h
	}

	return m
}
