const NORMALIZED_CLASS_MAP: Readonly<
	Record<
		string,
		readonly string[]
	>
> = {
	'text-center': [
		'text-center'
	],
	indent: [
		'indent-6'
	],
	small: [
		'text-sm'
	],
	'color-blue': [
		'text-vivid-b-700'
	],
	'color-green': [
		'text-support-a-700'
	],
	'color-dark-blue': [
		'text-vivid-b-900'
	],
	'color-red-brown': [
		'text-support-b-700'
	],
	nowrap: [
		'whitespace-nowrap'
	],
	// List marker presentation is resolved with structural context.
	'list-roman': [],
	'list-arabic': [],

	// Known POC vocabulary with no retained production presentation yet.
	// Keep these explicit so their omission is deliberate rather than accidental.
	'quote-text': [],
	scripSection: [],
	'list-marker': [],
	'list-marker-roman': [],
	'list-marker-arabic': [],
	'blb-tagged': []
};

export function resolveNormalizedClasses(
	classes: readonly string[] | null | undefined
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
				] ?? []
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
