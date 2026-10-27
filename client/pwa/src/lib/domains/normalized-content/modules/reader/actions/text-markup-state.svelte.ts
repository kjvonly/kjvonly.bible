import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { NormalizedContentAddress } from '../../../models/normalized-content-address.model';
import {
	NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES
} from '../../../models/normalized-content-navigation.model';
import type {
	NormalizedContentTextMarkup,
	NormalizedContentTextMarkupDocumentReference,
	NormalizedContentTextMarkupMap
} from '../../../models/normalized-content-text-markup.model';
import {
	cloneNormalizedContentTextMarkupMap,
	hasNormalizedContentTextMarkupDraftChanges
} from '../normalized-content-text-markup-draft';
import {
	applyNormalizedContentTextMarkupWord,
	removeNormalizedContentTextMarkupWord,
	toggleNormalizedContentTextMarkupWord,
	type NormalizedContentTextMarkupEditSelection
} from '../normalized-content-text-markup-edit';
import type { NormalizedContentTextMarkupLookupResult } from '../runtime/normalized-content-text-markup-lookup-result';
import { captureNormalizedContentTextMarkupSave } from '../runtime/normalized-content-text-markup-save';
import {
	ReaderActionEntry,
	ReaderActionExitReason,
	ReaderActionKind,
	ReaderActionOutcome,
	type ReaderActionEntryResult,
	type ReaderActionState
} from './reader-action-state';

/** Facts owned by the mounted Reader's document, authentication and lookup lifecycles. */
export interface TextMarkupEnvironment {
	readonly document: NormalizedDocument | undefined;
	readonly reference: NormalizedContentTextMarkupDocumentReference;
	readonly publisher: string | undefined;
	readonly observedPublisher: string | undefined;
	readonly accepted: NormalizedContentTextMarkup | undefined;
	readonly lookupLoading: boolean;
	readonly lookupFailed: boolean;
}

/** Narrow integrations with the existing Text Markup service and recovery Navigation view. */
export interface TextMarkupStatePorts {
	read(): TextMarkupEnvironment;
	openRecovery(): void;
	accept(markup: NormalizedContentTextMarkup): void;
	create(publisher: string): NormalizedContentTextMarkup;
	persist(markup: NormalizedContentTextMarkup): Promise<void>;
	markLookupVerified(): void;
	showError(message: string): void;
}

/** The Reader/controller decides which state to enter after the lookup view returns. */
export enum TextMarkupRecoveryDecision {
	TextMarkup = 'text-markup',
	WithoutMarkup = 'without-markup',
	Ignored = 'ignored'
}

/**
 * One Reader's Text Markup action behavior and reactive draft. This state
 * does not own relay verification, accepted Domain objects, or navigation.
 * The Reader forwards accepted-object notifications through onAccepted().
 */
export class TextMarkupState implements ReaderActionState {
	readonly kind = ReaderActionKind.TextMarkup;

	private draft = $state<NormalizedContentTextMarkupMap>({});
	private palette = $state<NormalizedContentTextMarkupEditSelection>({
		type: 'bg', colorMarkup: 'bg-highlighta'
	});
	private isSaving = $state(false);

	private active = false;
	private resumableSession = false;
	private recoveryApproved = false;

	constructor(private readonly ports: TextMarkupStatePorts) {}

	get markings(): NormalizedContentTextMarkupMap {
		return this.draft;
	}

	get selection(): NormalizedContentTextMarkupEditSelection {
		return this.palette;
	}

	get saving(): boolean {
		return this.isSaving;
	}

	setSelection(selection: NormalizedContentTextMarkupEditSelection): void {
		this.palette = selection;
	}

	/** A resumed action session retains the recovery choice and palette. */
	enter(entry: ReaderActionEntry): ReaderActionEntryResult {
		const facts = this.ports.read();
		if (!facts.document || !facts.publisher || facts.publisher !== facts.observedPublisher || facts.lookupLoading) {
			if (!facts.publisher) {
				this.ports.showError('Login first');
			}
			return ReaderActionOutcome.Rejected;
		}

		if (entry === ReaderActionEntry.Resume && this.resumableSession && facts.accepted) {
			this.draft = cloneNormalizedContentTextMarkupMap(facts.accepted.markings);
			this.active = true;
			return ReaderActionOutcome.Entered;
		}

		if (facts.lookupFailed && !this.recoveryApproved) {
			this.ports.openRecovery();
			return ReaderActionOutcome.Deferred;
		}
		if (!facts.accepted) {
			this.ports.showError('Unable to load Text Markup');
			return ReaderActionOutcome.Rejected;
		}

		this.recoveryApproved = false;
		this.resumableSession = true;
		this.active = true;
		this.draft = cloneNormalizedContentTextMarkupMap(facts.accepted.markings);
		return ReaderActionOutcome.Entered;
	}

	/**
	 * A normal switch saves once, only if the draft differs from accepted markup.
	 * Cancel and document/account reset never publish abandoned changes.
	 */
	exit(reason: ReaderActionExitReason): boolean | Promise<boolean> {
		if (reason === ReaderActionExitReason.ContextReset) {
			this.active = false;
			this.resumableSession = false;
			this.recoveryApproved = false;
			this.draft = {};
			return true;
		}
		if (this.isSaving || !this.active) {
			return false;
		}

		if (reason === ReaderActionExitReason.Cancel) {
			this.restoreAccepted();
			this.active = false;
			this.resumableSession = false;
			this.recoveryApproved = false;
			return true;
		}

		const facts = this.ports.read();
		if (!facts.publisher || facts.publisher !== facts.observedPublisher || !facts.accepted) {
			return false;
		}

		if (!hasNormalizedContentTextMarkupDraftChanges(facts.accepted.markings, this.draft)) {
			return this.completeExit(reason);
		}

		const saved = captureNormalizedContentTextMarkupSave(facts.accepted, this.draft);
		return this.persistAndExit(saved, reason);
	}

	/** Only a changed draft needs an asynchronous exit. */
	private async persistAndExit(
		saved: NormalizedContentTextMarkup,
		reason: ReaderActionExitReason
	): Promise<boolean> {
		this.isSaving = true;
		try {
			// The Domain put() notifies subscribers after committing the accepted object.
			await this.ports.persist(saved);
			if (this.ports.read().accepted?.id !== saved.id || !this.active) {
				return false;
			}
		} catch {
			if (this.ports.read().accepted?.id === saved.id && this.active) {
				this.ports.showError('Unable to save Text Markup');
			}
			return false;
		} finally {
			this.isSaving = false;
		}

		return this.completeExit(reason);
	}

	private completeExit(reason: ReaderActionExitReason): boolean {
		this.restoreAccepted();
		this.active = false;
		if (reason !== ReaderActionExitReason.SwitchAction) {
			this.resumableSession = false;
		}
		return true;
	}

	/** Domain notifications replace even an in-progress draft, as in the existing Reader. */
	onAccepted(markup: NormalizedContentTextMarkup): void {
		this.draft = cloneNormalizedContentTextMarkupMap(markup.markings);
	}

	/**
	 * Interprets the existing recovery view's typed result. A result does not
	 * choose the next state: the caller/controller owns that transition.
	 */
	applyRecoveryResult(result: NormalizedContentTextMarkupLookupResult): TextMarkupRecoveryDecision {
		const facts = this.ports.read();
		if (!facts.document || !facts.lookupFailed || facts.lookupLoading ||
			!facts.publisher || facts.publisher !== facts.observedPublisher) {
			return TextMarkupRecoveryDecision.Ignored;
		}

		if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP) {
			return TextMarkupRecoveryDecision.WithoutMarkup;
		}

		if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW) {
			try {
				const markup = facts.accepted ?? this.ports.create(facts.publisher);
				if (!facts.accepted) {
					this.ports.accept(markup);
				}
				this.recoveryApproved = true;
				return TextMarkupRecoveryDecision.TextMarkup;
			} catch {
				this.ports.showError('Unable to start new Text Markup');
				return TextMarkupRecoveryDecision.Ignored;
			}
		}

		if (result.publisher !== facts.publisher ||
			!matchesDocument(result.markup.document, facts.reference)) {
			return TextMarkupRecoveryDecision.Ignored;
		}
		this.ports.accept(result.markup);
		if (result.outcome === NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED) {
			this.ports.markLookupVerified();
		}
		this.recoveryApproved = true;
		return TextMarkupRecoveryDecision.TextMarkup;
	}

	onWordClick(address: NormalizedContentAddress): boolean {
		if (!this.active) {
			return false;
		}
		const document = this.ports.read().document;
		if (document && !this.isSaving) {
			toggleNormalizedContentTextMarkupWord(document, this.draft, address, this.palette);
		}
		return true;
	}

	onDragApply(address: NormalizedContentAddress): void {
		const document = this.ports.read().document;
		if (this.active && !this.isSaving && document) {
			applyNormalizedContentTextMarkupWord(document, this.draft, address, this.palette);
		}
	}

	onDragRemove(address: NormalizedContentAddress): void {
		const document = this.ports.read().document;
		if (this.active && !this.isSaving && document) {
			removeNormalizedContentTextMarkupWord(document, this.draft, address, this.palette);
		}
	}

	// Link routing is owned by the Reader and remains available in Text Markup mode.
	onLinkActivate(_hrefs: readonly string[]): boolean {
		return false;
	}

	private restoreAccepted(): void {
		const accepted = this.ports.read().accepted;
		this.draft = accepted ? cloneNormalizedContentTextMarkupMap(accepted.markings) : {};
	}
}

function matchesDocument(
	left: NormalizedContentTextMarkupDocumentReference,
	right: NormalizedContentTextMarkupDocumentReference
): boolean {
	return left.publisher === right.publisher &&
		left.resourceId === right.resourceId &&
		left.modifiedAt === right.modifiedAt;
}
