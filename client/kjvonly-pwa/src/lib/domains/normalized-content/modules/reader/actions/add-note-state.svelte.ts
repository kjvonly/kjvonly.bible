import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';
import type { NotesNormalizedDocumentNavigationIntent } from '$lib/domains/notes';
import { createNormalizedContentWordNotesIntent } from '../runtime/normalized-content-word-notes-navigation';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome,
	type ReaderActionEntryResult,
	type ReaderActionState
} from './reader-action-state';
import {
	matchesReaderWordActionEnvironment,
	type ReaderWordActionPorts
} from './word-action-ports';

export interface AddNoteStatePorts extends ReaderWordActionPorts {
	openNotes(intent: NotesNormalizedDocumentNavigationIntent): void;
}

/** Selects one canonical word and hands a Note creation intent to Navigation. */
export class AddNoteState implements ReaderActionState {
	readonly kind = ReaderActionKind.AddNote;
	private active = false;
	private isBusy = $state(false);

	constructor(private readonly ports: AddNoteStatePorts) {}

	get busy(): boolean {
		return this.isBusy;
	}

	enter(_entry: ReaderActionEntry): ReaderActionEntryResult {
		const { document, publisher } = this.ports.read();
		if (!document || !publisher) {
			this.ports.showError(!publisher ? 'Login first' : 'Document unavailable');
			return ReaderActionOutcome.Rejected;
		}
		this.active = true;
		return ReaderActionOutcome.Entered;
	}

	exit(reason: ReaderActionExitReason): boolean {
		if (this.isBusy && reason !== ReaderActionExitReason.ActionComplete &&
			reason !== ReaderActionExitReason.ContextReset) {
			return false;
		}
		this.active = false;
		return true;
	}

	onWordClick(address: NormalizedContentAddress): boolean {
		if (this.active && !this.isBusy) {
			void this.selectWord(address);
		}
		return true;
	}

	onDragApply(_address: NormalizedContentAddress): void {}
	onDragRemove(_address: NormalizedContentAddress): void {}

	/** Selection takes precedence over application and native link navigation. */
	onLinkActivate(_hrefs: readonly string[]): boolean {
		return true;
	}

	private async selectWord(address: NormalizedContentAddress): Promise<void> {
		const facts = this.ports.read();
		if (!facts.document || !facts.publisher) {
			return;
		}
		let intent: NotesNormalizedDocumentNavigationIntent;
		try {
			intent = createNormalizedContentWordNotesIntent(facts.descriptor, '', facts.document, address);
		} catch {
			this.ports.showError('Unable to select word for note');
			return;
		}

		this.isBusy = true;
		try {
			if (!this.active || !matchesReaderWordActionEnvironment(facts, this.ports.read())) {
				return;
			}
			// The state knows only that completion resumes its captured return state.
			const completed = await this.ports.complete();
			if (completed && matchesReaderWordActionEnvironment(facts, this.ports.read())) {
				this.ports.openNotes(intent);
			}
		} catch {
			if (this.active) {
				this.ports.showError('Unable to select word for note');
			}
		} finally {
			this.isBusy = false;
		}
	}
}
