/**
 * Application module identity used by navigation state and Module-owned policy.
 *
 * Keep the numeric values explicit. Renumbering is a deliberate persisted-state
 * compatibility break unless accompanied by a migration.
 */
export enum Modules {
	MODULES = 1,
	BIBLE = 2,
	STRONGS = 3,
	SEARCH = 4,
	NOTES = 5,
	PLANS = 6,
	LOGIN = 7,
	SETTINGS = 8,

	// Non-renderable sentinel used by Module-owned policy registration.
	NULL = 9,

	PROFILE = 10,
	ARCHIVE = 11
}
