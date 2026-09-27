export type {
	Note,
	NoteTag,
	NotesById
} from './models/note.model';

export {
	NOTE_OBJECT_TYPE,
	createNoteDomainObjectId
} from './models/note-id';

export {
	NotesService
} from './services/notes.service';

export {
	NOTES_RESOURCE_TYPE
} from './resources/note-interpreter';

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
