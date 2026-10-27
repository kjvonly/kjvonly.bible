import type {
	AvailableNote
} from '../../models/available-note';
import type {
	Note
} from '../../models/note.model';

/**
 * UI-only projection for one row in the Notes list.
 *
 * Installed Notes remain Note Domain Objects while available Notes remain
 * descriptor-backed discovery results. The union lets the Notes module present
 * both states as one logical list without collapsing their architectural
 * distinction.
 */
export type NoteListItem =
	| {
		readonly type:
			'installed';

		readonly note:
			Note;
	}
	| {
		readonly type:
			'available';

		readonly note:
			AvailableNote;
	};
