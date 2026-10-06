/** Canonical presentation classes allowed in NormalizedDocument v1. */
export const NORMALIZED_CLASS_NAMES = [
	'text-center',
	'indent',
	'nowrap',
	'list-roman',
	'list-arabic'
] as const;

/** One canonical presentation class stored on normalized blocks or words. */
export type NormalizedClassName =
	typeof NORMALIZED_CLASS_NAMES[number];

/** Canonical inline semantic marks allowed in NormalizedDocument v1. */
export const NORMALIZED_MARK_NAMES = [
	'superscript',
	'subscript',
	'underline',
	'strikethrough',
	'small',
	'code',
	'highlight'
] as const;

/** One canonical inline semantic mark stored on normalized words. */
export type NormalizedMark =
	typeof NORMALIZED_MARK_NAMES[number];

/** Narrows arbitrary source text to the closed canonical class vocabulary. */
export function isNormalizedClassName(
	value: string
): value is NormalizedClassName {
	return (
		NORMALIZED_CLASS_NAMES as
			readonly string[]
	).includes(
		value
	);
}
