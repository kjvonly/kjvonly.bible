// Package annotbus provides business access to annot domain.
package annotbus

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/delegate"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/business/sdk/sqldb"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
	"github.com/kjvonly/kjvonly.bible/foundation/otel"
)

// Set of error variables for CRUD operations.
var (
	ErrNotFound     = errors.New("annot not found")
	ErrUserDisabled = errors.New("user disabled")
)

type ErrStaleVersion struct {
	Message string
}

func (e ErrStaleVersion) Error() string {
	return e.Message
}

// Storer interface declares the behaviour this package needs to persist and
// retrieve data.
type Storer interface {
	NewWithTx(tx sqldb.CommitRollbacker) (Storer, error)
	Create(ctx context.Context, ant Annot) error
	Update(ctx context.Context, ant Annot) error
	Delete(ctx context.Context, ant Annot) error
	Query(ctx context.Context, filter QueryFilter, orderBy order.By, page page.Page) ([]Annot, error)
	Count(ctx context.Context, filter QueryFilter) (int, error)
	QueryByID(ctx context.Context, userID uuid.UUID, bookID int, chapter int) (Annot, error)
	QueryByUserID(ctx context.Context, userID uuid.UUID) ([]Annot, error)
}

// Business manages the set of APIs for annot api access.
type Business struct {
	log      *logger.Logger
	userBus  userbus.ExtBusiness
	delegate *delegate.Delegate
	storer   Storer
}

// NewBusiness constructs a annot business API for use.
func NewBusiness(log *logger.Logger, userBus userbus.ExtBusiness, delegate *delegate.Delegate, storer Storer) *Business {
	b := Business{
		log:      log,
		userBus:  userBus,
		delegate: delegate,
		storer:   storer,
	}

	b.registerDelegateFunctions()

	return &b
}

// NewWithTx constructs a new domain value that will use the
// specified transaction in any store related calls.
func (b *Business) NewWithTx(tx sqldb.CommitRollbacker) (*Business, error) {
	storer, err := b.storer.NewWithTx(tx)
	if err != nil {
		return nil, err
	}

	userBus, err := b.userBus.NewWithTx(tx)
	if err != nil {
		return nil, err
	}

	bus := Business{
		log:      b.log,
		userBus:  userBus,
		delegate: b.delegate,
		storer:   storer,
	}

	return &bus, nil
}

// Create adds a new annot to the system.
func (b *Business) Create(ctx context.Context, na NewAnnot) (Annot, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.create")
	defer span.End()

	usr, err := b.userBus.QueryByID(ctx, na.UserID)
	if err != nil {
		return Annot{}, fmt.Errorf("user.querybyid: %s: %w", na.UserID, err)
	}

	if !usr.Enabled {
		return Annot{}, ErrUserDisabled
	}

	now := time.Now()

	ant := Annot{
		UserID:      na.UserID,
		Annots:      na.Annots,
		BookID:      na.BookID,
		Chapter:     na.Chapter,
		Version:     na.Version,
		DateCreated: now,
		DateUpdated: now,
	}

	if err := b.storer.Create(ctx, ant); err != nil {
		return Annot{}, fmt.Errorf("create: %w", err)
	}

	return ant, nil
}

// Update modifies information about a annot.
func (b *Business) Update(ctx context.Context, ant Annot, ua UpdateAnnot) (Annot, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.update")
	defer span.End()

	if ua.Version-ant.Version != 1 {
		err := ErrStaleVersion{}
		err.Message = fmt.Sprintf("trying to update stale version. Current version is %d but trying to update to %d", ant.Version, ua.Version)
		return Annot{}, err
	}

	ant.Version = ua.Version

	if ua.Annots != nil {
		ant.Annots = ua.Annots
	}

	ant.DateUpdated = time.Now()

	if err := b.storer.Update(ctx, ant); err != nil {
		return Annot{}, fmt.Errorf("update: %w", err)
	}

	return ant, nil
}

// Delete removes the specified annot.
func (b *Business) Delete(ctx context.Context, ant Annot) error {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.delete")
	defer span.End()

	if err := b.storer.Delete(ctx, ant); err != nil {
		return fmt.Errorf("delete: %w", err)
	}

	return nil
}

// Query retrieves a list of existing annots.
func (b *Business) Query(ctx context.Context, filter QueryFilter, orderBy order.By, page page.Page) ([]Annot, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.query")
	defer span.End()

	ants, err := b.storer.Query(ctx, filter, orderBy, page)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	return ants, nil
}

// Count returns the total number of annots.
func (b *Business) Count(ctx context.Context, filter QueryFilter) (int, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.count")
	defer span.End()

	return b.storer.Count(ctx, filter)
}

// QueryByID finds the annot by the specified ID.
func (b *Business) QueryByID(ctx context.Context, userID uuid.UUID, bookID int, chapter int) (Annot, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.querybyid")
	defer span.End()

	ant, err := b.storer.QueryByID(ctx, userID, bookID, chapter)
	if err != nil {
		return Annot{}, fmt.Errorf("query: userID[%s] bookID[%d] chapter[%d]: %w", userID, bookID, chapter, err)
	}

	return ant, nil
}

// QueryByUserID finds the annots by a specified User ID.
func (b *Business) QueryByUserID(ctx context.Context, userID uuid.UUID) ([]Annot, error) {
	ctx, span := otel.AddSpan(ctx, "business.annotbus.querybyuserid")
	defer span.End()

	ants, err := b.storer.QueryByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	return ants, nil
}
