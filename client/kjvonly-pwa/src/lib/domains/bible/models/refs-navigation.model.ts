export const REFS_VIEWS = {
	ROOT: 'strongs.refs'
} as const;

export type RefsView =
	typeof REFS_VIEWS[
		keyof typeof REFS_VIEWS
	];
