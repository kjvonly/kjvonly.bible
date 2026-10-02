export type {
	Note,
	NoteTag,
	NotesById
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
	NOTE_DATA_TYPE_V1
} from './resources/notes-resource-contract';

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
	NOTES_VIEWS,
	type NotesView
} from './models/notes-navigation.model';
