import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';
import {
	ReaderActionKind,
	ReaderActionOutcome,
	type ReaderActionEntry,
	type ReaderActionExitReason,
	type ReaderActionState
} from './reader-action-state';

/** Ordinary Reader interaction. The Reader retains document/link navigation ownership. */
export class ReadingState implements ReaderActionState {
	readonly kind = ReaderActionKind.Reading;

	enter(_entry: ReaderActionEntry): ReaderActionOutcome.Entered {
		return ReaderActionOutcome.Entered;
	}

	exit(_reason: ReaderActionExitReason): boolean {
		return true;
	}

	onWordClick(_address: NormalizedContentAddress): boolean {
		return false;
	}

	onDragApply(_address: NormalizedContentAddress): void {}
	onDragRemove(_address: NormalizedContentAddress): void {}

	onLinkActivate(_hrefs: readonly string[]): boolean {
		return false;
	}
}
