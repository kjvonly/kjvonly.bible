export type {
	Note,
	NoteTag,
	NotesById,
	NormalizedDocumentNoteAddress,
	NormalizedDocumentNoteIdentity,
	NormalizedDocumentNoteAssociation
} from './models/note.model';

export type {
	AvailableNote
} from './models/available-note';

export {
	NOTE_OBJECT_TYPE,
	createNoteDomainObjectId
} from './models/note-id';

export {
	NotesService
} from './services/notes.service';

export {
	NotesAvailabilityService
} from './services/notes-availability.service';

export {
	NOTES_RESOURCE_TYPE,
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION
} from './resources/notes-resource-contract';

export {
	createNotesResourceId,
	parseNotesResourceId
} from './resources/notes-resource-id';

export {
	NoteDataTypeHandler
} from './resources/note-data-type-handler';

export {
	NoteDomainObjectFactory
} from './resources/note-domain-object-factory';

export {
	DEFAULT_NOTES_RESOURCE_NAME,
	createDefaultNotesSelection
} from './resources/notes-default-selection';

export {
	NOTES_COLLECTION_CHANGED
} from './events/notes-events';

export type {
	NotesSearchResult
} from './runtime/search/notes-search-worker-message';

export {
	NOTES_BIBLE_SCOPE_KINDS,
	NOTES_VIEWS,
	parseNotesBibleScope,
	parseNotesBibleNavigationIntent,
	parseNotesNavigationIntent,
	parseNotesNormalizedDocumentNavigationIntent,
	parseNotesNormalizedDocumentScope,
	parseNotesNormalizedDocumentTarget,
	type NotesBibleScope,
	type NotesBibleScopeKind,
	type NotesBibleNavigationIntent,
	type NotesNavigationIntent,
	type NotesNormalizedDocumentNavigation,
	type NotesNormalizedDocumentNavigationIntent,
	type NotesView
} from './models/notes-navigation.model';

export {
	filterNotesByNormalizedDocumentScope,
	noteBelongsToNormalizedDocumentScope,
	createNormalizedDocumentAssociationForScope,
	createNormalizedDocumentWordNoteMarkers,
	type NotesNormalizedDocumentScope
} from './services/notes-normalized-document-scope';
