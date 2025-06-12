package apitest

import (
	"github.com/kjvonly/kjvonly.bible/business/domain/auditbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/homebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/notebus"
	"github.com/kjvonly/kjvonly.bible/business/domain/productbus"
	"github.com/kjvonly/kjvonly.bible/business/domain/userbus"
)

// User extends the dbtest user for api test support.
type User struct {
	userbus.User
	Products []productbus.Product
	Homes    []homebus.Home
	Notes    []notebus.Note
	Audits   []auditbus.Audit
	Token    string
}

// SeedData represents users for api tests.
type SeedData struct {
	Users  []User
	Admins []User
}

// Table represent fields needed for running an api test.
type Table struct {
	Name       string
	URL        string
	Token      string
	Method     string
	StatusCode int
	Input      any
	GotResp    any
	ExpResp    any
	CmpFunc    func(got any, exp any) string
}
