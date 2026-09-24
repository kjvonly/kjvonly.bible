/**
 * Public application API.
 *
 * Code outside the application layer should consume application capabilities
 * through this boundary instead of importing application implementation files
 * directly. Application implementation files should continue to use direct
 * internal imports to avoid self-barrel dependency cycles. The concrete
 * Application composition root is intentionally not exported here.
 * `src/routes/+layout.svelte` is the application bootstrap boundary and is the
 * only runtime location that should import Application directly. Other runtime
 * code should consume this public API, `$lib/application/ui`, or
 * ApplicationContext instead.
 */

// CONFIG
export {
	createApplicationConfig,
	type ApplicationConfig
} from './config/application.config';

// SERVICES
export {
	SettingsService,
	type SettingsSubscriber
} from './services/settings.service';

export {
	NavigationService,
	type NavigationComponentProps,
	type NavigationView
} from './services/navigation.service';

export type {
	AccountSetup,
	AccountUpdate,
	AccountStrategy
} from './services/account/account-strategy';

export type {
	AccountRelay,
	AccountState,
	AccountStateSubscriber
} from './services/account/account-state';

export type {
	AuthenticationResult,
	AuthenticationStrategy
} from './services/authentication/authentication-strategy';

export type {
	ExportableAuthenticationSecret
} from './services/authentication/exportable-authentication-secret';

// MODELS
export { Modules } from './models/modules.model';

export type {
	Settings
} from './models/settings.model';

// RUNTIME
export {
	provideApplicationContext,
	useApplicationContext,
	type ApplicationContext
} from './runtime/application-context';

export {
	PaneSplit
} from './runtime/pane/models/pane-split';

export type {
	Pane
} from './runtime/pane/models/pane.model';

export type {
	BibleBufferBag,
	NotesBufferBag,
	ReferencesBufferBag,
	ReadingPlansBufferBag,
	BufferBag
} from './runtime/buffer/models/buffer-bag.model';

export {
	WorkspaceChangeType,
	WorkspaceRuntime,
	type WorkspaceChange,
	type WorkspaceSplitResult
} from './runtime/workspace/workspace-runtime';

export {
	deriveWorkspaceLayout,
	sortPaneIDs,
	type WorkspaceLayout,
	type WorkspacePaneDimensionsByID
} from './runtime/workspace/workspace-layout';

// RESOURCE SELECTION
export {
	buildRequiredResourceSelections,
	type ModuleResourceSelectionBuildContext,
	type ModuleResourceSelectionContributor
} from './resources/module-resource-selection-contributor';

export type {
	ResourceSelectionStore
} from './resources/resource-selection-store';

export {
	parseResourceSelections,
	type ResourceSelections
} from './resources/resource-selections';

// OUTBOX
export {
	createPendingPublication,
	type OutboxEntry,
	type OutboxStatus
} from './outbox/outbox-entry';

export type {
	OutboxPublicationIntent
} from './outbox/outbox-publication-intent';

export type {
	OutboxPublicationStrategy
} from './outbox/outbox-publication-strategy';

export type {
	OutboxWakeup
} from './outbox/outbox-wakeup';

// ARCHIVE
export {
	KJVONLY_ARCHIVE_VERSION,
	type ArchivedDomainObject,
	type KJVOnlyArchiveV1
} from './archive/kjvonly-archive';

export {
	KJVOnlyArchiveValidator
} from './archive/kjvonly-archive-validator';

export {
	KJVOnlyArchiveCodec
} from './archive/kjvonly-archive-codec';

export {
	KJVOnlyArchiveExporter
} from './archive/kjvonly-archive-exporter';

export type {
	KJVOnlyArchiveExportIdsSelection
} from './archive/kjvonly-archive-export-ids-selection';

export {
	matchesKJVOnlyArchiveExportSelection,
	matchesObjectIdPatterns,
	parseKJVOnlyArchiveExportPatterns,
	type KJVOnlyArchiveExportSelection,
	type KJVOnlyArchiveExportTypeSelection
} from './archive/kjvonly-archive-export-selection';

export {
	KJVOnlyArchiveImporter,
	type KJVOnlyArchiveImportOutcome,
	type KJVOnlyArchiveImportResult,
	type KJVOnlyArchiveImportStatus
} from './archive/kjvonly-archive-importer';

export {
	KJVOnlyArchiveService
} from './archive/kjvonly-archive.service';
