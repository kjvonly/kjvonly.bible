import type {
	ReaderActionEntryResult,
	ReaderActionState,
	ReaderActionTransitionResult
} from './reader-action-state';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionOutcome
} from './reader-action-state';

/**
 * Per-Reader transition coordinator. States own all action behavior and effects;
 * the controller knows only how to exit, enter, and resume a captured state.
 * Opening a Navigation view does not transition or suspend this controller.
 */
export class ReaderActionController {
	private activeState = $state.raw<ReaderActionState>(undefined!);
	private isTransitioning = $state(false);

	get currentState(): ReaderActionState {
		return this.activeState;
	}

	get transitioning(): boolean {
		return this.isTransitioning;
	}

	private returnState?: ReaderActionState;
	private operation?: object;

	/** The initial state is already active when the Reader composes the controller. */
	constructor(initialState: ReaderActionState) {
		this.activeState = initialState;
	}

	/** Switch actions or close the action session using the current state's exit rules. */
	switchTo(
		next: ReaderActionState,
		reason:
			| ReaderActionExitReason.SwitchAction
			| ReaderActionExitReason.ActionComplete
			| ReaderActionExitReason.SaveAndClose
			| ReaderActionExitReason.Cancel = ReaderActionExitReason.SwitchAction
	): Promise<ReaderActionTransitionResult> {
		return this.transitionTo(next, reason, ReaderActionEntry.Initial, false);
	}

	/** Capture the current state to resume when this temporary action finishes. */
	enterTemporary(next: ReaderActionState): Promise<ReaderActionTransitionResult> {
		if (this.returnState) {
			return Promise.resolve(ReaderActionOutcome.Blocked);
		}
		return this.transitionTo(next, ReaderActionExitReason.SwitchAction, ReaderActionEntry.Initial, true);
	}

	/** The caller reports completion/cancellation; the temporary state does not choose its successor. */
	returnFromTemporary(
		reason: ReaderActionExitReason.ActionComplete | ReaderActionExitReason.Cancel
	): Promise<ReaderActionTransitionResult> {
		if (!this.returnState) {
			return Promise.resolve(ReaderActionOutcome.Blocked);
		}
		return this.transitionTo(this.returnState, reason, ReaderActionEntry.Resume, false);
	}

	/**
	 * A different document/account invalidates any pending transition. Publish
	 * the new active state immediately; cleanup must never save abandoned edits.
	 */
	async resetForContext(next: ReaderActionState): Promise<ReaderActionTransitionResult> {
		const previous = this.currentState;
		const operation = {};
		this.operation = operation;
		this.isTransitioning = true;
		this.returnState = undefined;
		this.activeState = next;

		try {
			await previous.exit(ReaderActionExitReason.ContextReset);
			if (this.operation !== operation) {
				return ReaderActionOutcome.Blocked;
			}
			const entered = await next.enter(ReaderActionEntry.Initial);
			return this.operation === operation ? entered : ReaderActionOutcome.Blocked;
		} finally {
			this.finishOperation(operation);
		}
	}

	private async transitionTo(
		next: ReaderActionState,
		reason: ReaderActionExitReason,
		entry: ReaderActionEntry,
		captureReturn: boolean
	): Promise<ReaderActionTransitionResult> {
		if (this.transitioning) {
			return ReaderActionOutcome.Blocked;
		}
		if (next === this.currentState) {
			return ReaderActionOutcome.Entered;
		}

		const previous = this.currentState;
		const operation = {};
		this.operation = operation;
		this.isTransitioning = true;

		try {
			const exitResult = previous.exit(reason);
			// Preserve synchronous transitions when no asynchronous cleanup is needed.
			const exited = typeof exitResult === 'boolean' ? exitResult : await exitResult;
			if (this.operation !== operation || !exited) {
				return ReaderActionOutcome.Blocked;
			}

			let result: ReaderActionEntryResult;
			try {
				const entryResult = next.enter(entry);
				result = typeof entryResult === 'string' ? entryResult : await entryResult;
			} catch (error) {
				if (this.operation === operation) {
					await previous.enter(ReaderActionEntry.Resume);
				}
				throw error;
			}
			if (this.operation !== operation) {
				return ReaderActionOutcome.Blocked;
			}
			if (result !== ReaderActionOutcome.Entered) {
				// An entry can defer to an existing Navigation view. Keep the
				// controller available for its result in the same event turn.
				const resumeResult = previous.enter(ReaderActionEntry.Resume);
				if (typeof resumeResult !== 'string') {
					await resumeResult;
				}
				return result;
			}

			this.activeState = next;
			this.returnState = captureReturn ? previous : undefined;
			return ReaderActionOutcome.Entered;
		} finally {
			this.finishOperation(operation);
		}
	}

	private finishOperation(operation: object): void {
		if (this.operation === operation) {
			this.operation = undefined;
			this.isTransitioning = false;
		}
	}
}
