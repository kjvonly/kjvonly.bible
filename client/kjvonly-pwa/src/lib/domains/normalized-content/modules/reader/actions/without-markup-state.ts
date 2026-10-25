import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';
import {
	ReaderActionKind,
	ReaderActionOutcome,
	type ReaderActionEntry,
	type ReaderActionExitReason,
	type ReaderActionState
} from './reader-action-state';

/** An explicit recovery choice: permit other actions, never apply Text Markup. */
export class WithoutMarkupState implements ReaderActionState {
	readonly kind = ReaderActionKind.WithoutMarkup;

	enter(_entry: ReaderActionEntry): ReaderActionOutcome.Entered {
		return ReaderActionOutcome.Entered;
	}

	exit(_reason: ReaderActionExitReason): boolean {
		return true;
	}

	onWordClick(_address: NormalizedContentAddress): boolean {
		// Consume selection clicks while action tools are open; do not mark words.
		return true;
	}

	onDragApply(_address: NormalizedContentAddress): void {}
	onDragRemove(_address: NormalizedContentAddress): void {}

	onLinkActivate(_hrefs: readonly string[]): boolean {
		return false;
	}
}
