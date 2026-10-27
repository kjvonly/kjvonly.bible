import type {
	NormalizedClassName
} from '@kjvonly/normalized-content';

const NORMALIZED_CLASS_MAP: Readonly<
	Record<
		NormalizedClassName,
		readonly string[]
	>
> = {
	'text-center': [
		'text-center'
	],
	indent: [
		'indent-6'
	],
	nowrap: [
		'whitespace-nowrap'
	],

	// List marker presentation is resolved with structural context.
	'list-roman': [],
	'list-arabic': []
};

export function resolveNormalizedClasses(
	classes: readonly NormalizedClassName[] | undefined
): string | undefined {
	if (
		!classes ||
		classes.length ===
			0
	) {
		return undefined;
	}

	const resolved =
		new Set<string>();

	for (
		const className of classes
	) {
		for (
			const mappedClass of
				NORMALIZED_CLASS_MAP[
					className
				]
		) {
			resolved.add(
				mappedClass
			);
		}
	}

	if (
		resolved.size ===
			0
	) {
		return undefined;
	}

	return [
		...resolved
	].join(
		' '
	);
}
