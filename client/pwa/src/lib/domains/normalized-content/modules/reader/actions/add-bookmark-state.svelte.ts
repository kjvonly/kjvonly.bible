import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';
import {
	createNormalizedContentBookmarkSelection,
	type NormalizedContentBookmarkSelection
} from '../runtime/normalized-content-bookmark-selection';
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

export interface AddBookmarkStatePorts extends ReaderWordActionPorts {
	create(selection: NormalizedContentBookmarkSelection): Promise<void>;
}

/** Selects a canonical word and creates a Bookmark through the owning Domain. */
export class AddBookmarkState implements ReaderActionState {
	readonly kind = ReaderActionKind.AddBookmark;
	private active = false;
	private isBusy = $state(false);

	constructor(private readonly ports: AddBookmarkStatePorts) {}

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

	onLinkActivate(_hrefs: readonly string[]): boolean {
		return true;
	}

	private async selectWord(address: NormalizedContentAddress): Promise<void> {
		const facts = this.ports.read();
		if (!facts.document || !facts.publisher) {
			return;
		}
		let selection: NormalizedContentBookmarkSelection;
		try {
			selection = createNormalizedContentBookmarkSelection(facts.descriptor, facts.document, address);
		} catch {
			this.ports.showError('Unable to select word for bookmark');
			return;
		}

		this.isBusy = true;
		try {
			await this.ports.create(selection);
			if (this.active && matchesReaderWordActionEnvironment(facts, this.ports.read())) {
				await this.ports.complete();
			}
		} catch {
			if (this.active) {
				this.ports.showError('Could not add Bookmark');
			}
		} finally {
			this.isBusy = false;
		}
	}
}
