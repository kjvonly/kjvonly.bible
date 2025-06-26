// Package notebus provides business access to note domain.
package notebus

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
	ErrNotFound     = errors.New("note not found")
	ErrUserDisabled = errors.New("user disabled")
)

// Storer interface declares the behaviour this package needs to persist and
// retrieve data.
type Storer interface {
	NewWithTx(tx sqldb.CommitRollbacker) (Storer, error)
	Create(ctx context.Context, nte Note) error
	Update(ctx context.Context, nte Note) error
	Delete(ctx context.Context, nte Note) error
	Query(ctx context.Context, filter QueryFilter, orderBy order.By, page page.Page) ([]Note, error)
	Count(ctx context.Context, filter QueryFilter) (int, error)
	QueryByID(ctx context.Context, noteID uuid.UUID) (Note, error)
	QueryByUserID(ctx context.Context, userID uuid.UUID) ([]Note, error)
}

// Business manages the set of APIs for note api access.
type Business struct {
	log      *logger.Logger
	userBus  userbus.ExtBusiness
	delegate *delegate.Delegate
	storer   Storer
}

// NewBusiness constructs a note business API for use.
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

// Create adds a new note to the system.
func (b *Business) Create(ctx context.Context, nn NewNote) (Note, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.create")
	defer span.End()

	usr, err := b.userBus.QueryByID(ctx, nn.UserID)
	if err != nil {
		return Note{}, fmt.Errorf("user.querybyid: %s: %w", nn.UserID, err)
	}

	if !usr.Enabled {
		return Note{}, ErrUserDisabled
	}

	now := time.Now()

	nte := Note{
		ID:         uuid.New(),
		Type:       nn.Type,
		Tags:       nn.Tags,
		UserID:     nn.UserID,
		BCV:        nn.BCV,
		ChapterKey: nn.ChapterKey,
		Title:      nn.Title,
		Html:       nn.Html,
		Text:       nn.Text,

		DateCreated: now,
		DateUpdated: now,
	}

	if err := b.storer.Create(ctx, nte); err != nil {
		return Note{}, fmt.Errorf("create: %w", err)
	}

	return nte, nil
}

// Update modifies information about a note.
func (b *Business) Update(ctx context.Context, nte Note, un UpdateNote) (Note, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.update")
	defer span.End()

	if un.Type != nil {

		nte.Type = *un.Type
	}

	if un.Title != nil {
		nte.Title = *un.Title
	}
	if un.Html != nil {
		nte.Html = *un.Html
	}
	if un.Text != nil {
		nte.Text = *un.Text
	}

	if un.Tags != nil {
		nte.Tags = un.Tags
	}

	nte.DateUpdated = time.Now()

	if err := b.storer.Update(ctx, nte); err != nil {
		return Note{}, fmt.Errorf("update: %w", err)
	}

	return nte, nil
}

// Delete removes the specified note.
func (b *Business) Delete(ctx context.Context, nte Note) error {
	ctx, span := otel.AddSpan(ctx, "business.notebus.delete")
	defer span.End()

	if err := b.storer.Delete(ctx, nte); err != nil {
		return fmt.Errorf("delete: %w", err)
	}

	return nil
}

// Query retrieves a list of existing notes.
func (b *Business) Query(ctx context.Context, filter QueryFilter, orderBy order.By, page page.Page) ([]Note, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.query")
	defer span.End()

	ntes, err := b.storer.Query(ctx, filter, orderBy, page)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	return ntes, nil
}

// Count returns the total number of notes.
func (b *Business) Count(ctx context.Context, filter QueryFilter) (int, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.count")
	defer span.End()

	return b.storer.Count(ctx, filter)
}

// QueryByID finds the note by the specified ID.
func (b *Business) QueryByID(ctx context.Context, noteID uuid.UUID) (Note, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.querybyid")
	defer span.End()

	nte, err := b.storer.QueryByID(ctx, noteID)
	if err != nil {
		return Note{}, fmt.Errorf("query: noteID[%s]: %w", noteID, err)
	}

	return nte, nil
}

// QueryByUserID finds the notes by a specified User ID.
func (b *Business) QueryByUserID(ctx context.Context, userID uuid.UUID) ([]Note, error) {
	ctx, span := otel.AddSpan(ctx, "business.notebus.querybyuserid")
	defer span.End()

	ntes, err := b.storer.QueryByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	return ntes, nil
}
