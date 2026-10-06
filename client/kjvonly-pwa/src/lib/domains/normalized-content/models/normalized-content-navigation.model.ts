export const NORMALIZED_CONTENT_VIEWS = {
	READER: 'normalized-content.reader'
} as const;

export type NormalizedContentView =
	typeof NORMALIZED_CONTENT_VIEWS[
		keyof typeof NORMALIZED_CONTENT_VIEWS
	];
