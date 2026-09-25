import type { MouseEventHandler } from 'svelte/elements';

///////////////////////////////////////////////////////////////////////////////

/** Semantic icon identifier resolved by the shared header icon mapper. */
export type HeaderIconID =
	| 'arrow-back'
	| 'more-vertical';

/** One interactive action rendered in a shared application header. */
export interface HeaderActionDefinition {
	icon: HeaderIconID;
	label: string;
	onClick: MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
}

/** Optional interaction applied to the shared title/context region. */
export interface HeaderTitleActionDefinition {
	label: string;
	onClick: MouseEventHandler<HTMLButtonElement>;
}

/**
 * Header trailing actions are intentionally limited to three slots.
 * Overflow, when present, occupies one of these slots.
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
