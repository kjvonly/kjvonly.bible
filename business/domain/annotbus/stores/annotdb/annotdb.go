// Package annotdb contains annot related CRUD functionality.
package annotdb

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/kjvonly/kjvonly.bible/business/domain/annotbus"
	"github.com/kjvonly/kjvonly.bible/business/sdk/order"
	"github.com/kjvonly/kjvonly.bible/business/sdk/page"
	"github.com/kjvonly/kjvonly.bible/business/sdk/sqldb"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
)

// Store manages the set of APIs for annot database access.
type Store struct {
	log *logger.Logger
	db  sqlx.ExtContext
}

// NewStore constructs the api for data access.
func NewStore(log *logger.Logger, db *sqlx.DB) *Store {
	return &Store{
		log: log,
		db:  db,
	}
}

// NewWithTx constructs a new Store value replacing the sqlx DB
// value with a sqlx DB value that is currently inside a transaction.
func (s *Store) NewWithTx(tx sqldb.CommitRollbacker) (annotbus.Storer, error) {
	ec, err := sqldb.GetExtContext(tx)
	if err != nil {
		return nil, err
	}

	store := Store{
		log: s.log,
		db:  ec,
	}

	return &store, nil
}

// Create inserts a new annot into the database.
func (s *Store) Create(ctx context.Context, ant annotbus.Annot) error {
	const q = `
    INSERT INTO annots
        (
            annot_id,
            user_id,
			book_id,
			chapter,
			verse,
			word_index,
            html,
            text,
            title,
            tags,
			version,
            date_created,
            date_updated
		)
    VALUES
        (
            :annot_id,
            :user_id,
			:book_id,
			:chapter,
			:verse,
			:word_index,
            :html,
            :text,
            :title,
            :tags,
			:version,
            :date_created,
            :date_updated
		)`

	dbNte, err := toDBAnnot(ant)
	if err != nil {
		return fmt.Errorf("toDBAnnot: %w", err)
	}
	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, dbNte); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Delete removes a annot from the database.
func (s *Store) Delete(ctx context.Context, ant annotbus.Annot) error {
	data := struct {
		ID string `db:"annot_id"`
	}{
		ID: ant.ID.String(),
	}

	const q = `
    DELETE FROM
	    annots
	WHERE
	  	annot_id = :annot_id`

	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, data); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Update replaces a annot document in the database.
func (s *Store) Update(ctx context.Context, ant annotbus.Annot) error {
	const q = `
    UPDATE
        annots
    SET
		"book_id"		=	:book_id,
		"chapter"		= 	:chapter,
		"verse"			=	:verse,
		"word_index"	=	:word_index,
        "html"          =   :html,
        "text"          =   :text,
        "title"         =   :title,
        "tags"          =   :tags,
		"version"		=	:version,
        "date_updated"  =   :date_updated
    WHERE
        annot_id = :annot_id`

	dbNte, err := toDBAnnot(ant)
	if err != nil {
		return fmt.Errorf("toDBAnnot: %w", err)
	}
	if err := sqldb.NamedExecContext(ctx, s.log, s.db, q, dbNte); err != nil {
		return fmt.Errorf("namedexeccontext: %w", err)
	}

	return nil
}

// Query retrieves a list of existing annots from the database.
func (s *Store) Query(ctx context.Context, filter annotbus.QueryFilter, orderBy order.By, page page.Page) ([]annotbus.Annot, error) {
	data := map[string]any{
		"offset":        (page.Number() - 1) * page.RowsPerPage(),
		"rows_per_page": page.RowsPerPage(),
	}

	const q = `
    SELECT
        annot_id,
        user_id,
		book_id,
		chapter,
		verse,
		word_index,
        html,
        text,
        title,
        tags,
		version,
        date_created,
        date_updated
	FROM
	  	annots`

	buf := bytes.NewBufferString(q)
	s.applyFilter(filter, data, buf)

	orderByClause, err := orderByClause(orderBy)
	if err != nil {
		return nil, err
	}

	buf.WriteString(orderByClause)
	buf.WriteString(" OFFSET :offset ROWS FETCH NEXT :rows_per_page ROWS ONLY")

	var dbNtes []annot
	if err := sqldb.NamedQuerySlice(ctx, s.log, s.db, buf.String(), data, &dbNtes); err != nil {
		return nil, fmt.Errorf("namedqueryslice: %w", err)
	}

	ants, err := toBusAnnots(dbNtes)
	if err != nil {
		return nil, err
	}

	return ants, nil
}

// Count returns the total number of annots in the DB.
func (s *Store) Count(ctx context.Context, filter annotbus.QueryFilter) (int, error) {
	data := map[string]any{}

	const q = `
    SELECT
        count(1)
    FROM
        annots`

	buf := bytes.NewBufferString(q)
	s.applyFilter(filter, data, buf)

	var count struct {
		Count int `db:"count"`
	}
	if err := sqldb.NamedQueryStruct(ctx, s.log, s.db, buf.String(), data, &count); err != nil {
		return 0, fmt.Errorf("db: %w", err)
	}

	return count.Count, nil
}

// QueryByID gets the specified annot from the database.
func (s *Store) QueryByID(ctx context.Context, annotID uuid.UUID) (annotbus.Annot, error) {
	data := struct {
		ID string `db:"annot_id"`
	}{
		ID: annotID.String(),
	}

	const q = `
    SELECT
        annot_id,
        user_id,
		book_id,
		chapter,
		verse,
		word_index,
        html,
        text,
        title,
        tags,
		version,
        date_created,
        date_updated
    FROM
        annots
    WHERE
        annot_id = :annot_id`

	var dbNte annot
	if err := sqldb.NamedQueryStruct(ctx, s.log, s.db, q, data, &dbNte); err != nil {
		if errors.Is(err, sqldb.ErrDBNotFound) {
			return annotbus.Annot{}, fmt.Errorf("db: %w", annotbus.ErrNotFound)
		}
		return annotbus.Annot{}, fmt.Errorf("db: %w", err)
	}

	return toBusAnnot(dbNte)
}

// QueryByUserID gets the specified annot from the database by user id.
func (s *Store) QueryByUserID(ctx context.Context, userID uuid.UUID) ([]annotbus.Annot, error) {
	data := struct {
		ID string `db:"user_id"`
	}{
		ID: userID.String(),
	}

	const q = `
	SELECT
        annot_id,
        user_id,
		book_id,
		chapter,
		verse,
		word_index,
        html,
        text,
        title,
        tags,
		version,
        date_created,
        date_updated
	FROM
		annots
	WHERE
		user_id = :user_id`

	var dbNtes []annot
	if err := sqldb.NamedQuerySlice(ctx, s.log, s.db, q, data, &dbNtes); err != nil {
		return nil, fmt.Errorf("db: %w", err)
	}

	return toBusAnnots(dbNtes)
}
