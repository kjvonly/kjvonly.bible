import type { MouseEventHandler } from 'svelte/elements';

///////////////////////////////////////////////////////////////////////////////

/** Semantic icon identifier resolved by the shared header icon mapper. */
export type HeaderIconID =
	| 'add'
	| 'add-circle'
	| 'add-note'
	| 'book-ribbon'
	| 'alpha-numeric'
	| 'arrow-back'
	| 'check'
	| 'check-circle'
	| 'copy'
	| 'document-search'
	| 'close'
	| 'edit'
	| 'edit-off'
	| 'export'
	| 'filter'
	| 'format-list-numbered'
	| 'import'
	| 'grid'
	| 'list'
	| 'pending'
	| 'save'
	| 'search'
	| 'split-horizontal'
	| 'split-vertical'
	| 'tag';

/** One interactive action rendered in a shared application header. */
export interface HeaderActionDefinition {
	icon: HeaderIconID;
	label: string;
	onClick: MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
	selected?: boolean;
}

/** Optional interaction applied to the shared title/context region. */
export interface HeaderTitleActionDefinition {
	label: string;
	onClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Generic Header action definitions are intentionally limited to three slots.
 * Caller-owned `trailingContent` also consumes a visual slot, so callers using
 * the standard More Actions control should expose at most two direct actions.
 */
export type HeaderActions =
	| readonly []
	| readonly [HeaderActionDefinition]
	| readonly [HeaderActionDefinition, HeaderActionDefinition]
	| readonly [
		HeaderActionDefinition,
		HeaderActionDefinition,
		HeaderActionDefinition
	];
