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
            user_id,
			book_id,
			chapter,
            annots,
			version,
            date_created,
            date_updated
		)
    VALUES
        (
            :user_id,
			:book_id,
			:chapter,
            :annots,
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
		UserID  string `db:"user_id"`
		BookID  int    `db:"book_id"`
		Chapter int    `db:"chapter"`
	}{
		UserID:  ant.UserID.String(),
		BookID:  ant.BookID,
		Chapter: ant.Chapter,
	}

	const q = `
    DELETE FROM
	    annots
	WHERE
	  	user_id = :user_id AND book_id = :book_id AND chapter = :chapter`

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
	    "user_id".      =   :user_id,
		"book_id"		=	:book_id,
		"chapter"		= 	:chapter,
        "annots"          = :annots,
		"version"		=	:version,
        "date_updated"  =   :date_updated
    WHERE
        user_id = :user_id AND book_id = :book_id AND chapter = :chapter`

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
        user_id,
		book_id,
		chapter,
        anots,
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
func (s *Store) QueryByID(ctx context.Context, userID uuid.UUID, bookID int, chapter int) (annotbus.Annot, error) {
	data := struct {
		UserID  string `db:"user_id"`
		BookID  int    `db:"book_id"`
		Chapter int    `db:"chapter"`
	}{
		UserID:  userID.String(),
		BookID:  bookID,
		Chapter: chapter,
	}

	const q = `
    SELECT
        user_id,
		book_id,
		chapter,
        annots,
		version,
        date_created,
        date_updated
    FROM
        annots
    WHERE
        user_id = :user_id AND book_id = :book_id AND chapter = :chapter`

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
        user_id,
		book_id,
		chapter,
		annots,
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
