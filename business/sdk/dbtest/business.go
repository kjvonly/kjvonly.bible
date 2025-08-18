package dbtest

import (
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/kjvonly/kjvonly.bible/business/domain/auditbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/auditbus/stores/auditdb"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus/stores/homedb"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus/stores/notedb"
	"github.com/kjvonly/kjvonly.bible/business/domain/productbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/productbus/stores/productdb"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus/extensions/useraudit"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus/extensions/userotel"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus/stores/usercache"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus/stores/userdb"
	"github.com/kjvonly/kjvonly.bible/business/domain/vproductbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/vproductbus/stores/vproductdb"
	"github.com/kjvonly/kjvonly.bible/business/sdk/delegate"
	"github.com/kjvonly/kjvonly.bible/foundation/logger"
)

// BusDomain represents all the business domain apis needed for testing.
type BusDomain struct {
	Delegate *delegate.Delegate
	Audit    *auditbus.Business
	Home     *homebus.Business
	Note     *notebus.Business
	Product  *productbus.Business
	User     userbus.ExtBusiness
	VProduct *vproductbus.Business
}

func newBusDomains(log *logger.Logger, db *sqlx.DB) BusDomain {
	userOtelExt := userotel.NewExtension()
	userAuditExt := useraudit.NewExtension(auditbus.NewBusiness(log, auditdb.NewStore(log, db)))
	userStorage := usercache.NewStore(log, userdb.NewStore(log, db), time.Hour)

	delegate := delegate.New(log)
	auditBus := auditbus.NewBusiness(log, auditdb.NewStore(log, db))
	userBus := userbus.NewBusiness(log, delegate, userStorage, userOtelExt, userAuditExt)
	productBus := productbus.NewBusiness(log, userBus, delegate, productdb.NewStore(log, db))
	homeBus := homebus.NewBusiness(log, userBus, delegate, homedb.NewStore(log, db))

	noteBus := notebus.NewBusiness(log, userBus, delegate, notedb.NewStore(log, db))

	vproductBus := vproductbus.NewBusiness(vproductdb.NewStore(log, db))

	return BusDomain{
		Delegate: delegate,
		Audit:    auditBus,
		Home:     homeBus,
		Note:     noteBus,
		Product:  productBus,
		User:     userBus,
		VProduct: vproductBus,
	}
}
