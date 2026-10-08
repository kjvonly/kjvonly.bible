import type {
	Element
} from 'domhandler';

import {
	isNormalizedClassName
} from '@kjvonly/normalized-content';

import type {
	NormalizedClassName
} from '@kjvonly/normalized-content';

/**
 * Projects only source-independent presentation hints into the normalized
 * document. Collection-specific class names and arbitrary CSS are intentionally
 * ignored so one import corpus does not define the canonical class vocabulary.
 */
export function projectNormalizedClasses(
	element: Element
): NormalizedClassName[] | undefined {
	const projected =
		new Set<NormalizedClassName>();

	for (
		const className of parseClassNames(
			element.attribs.class
		)
	) {
		if (
			isNormalizedClassName(
				className
			)
		) {
			projected.add(
				className
			);
		}
	}

	if (
		parseStyle(
			element.attribs.style
		).get(
			'text-align'
		) ===
			'center'
	) {
		projected.add(
			'text-center'
		);
	}

	return projected.size > 0
		? [
			...projected
		]
		: undefined;
}

/** Returns source class names intentionally discarded by the generic projector. */
export function getIgnoredSourceClassNames(
	element: Element
): string[] {
	return parseClassNames(
		element.attribs.class
	).filter(
		className =>
			!isNormalizedClassName(
				className
			)
	);
}

function parseClassNames(
	value: string | undefined
): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(
			/\s+/
		)
		.map(
			className =>
				className.trim()
		)
		.filter(
			Boolean
		);
}

function parseStyle(
	value: string | undefined
): ReadonlyMap<string, string> {
	const declarations =
		new Map<string, string>();

	if (!value) {
		return declarations;
	}

	for (
		const declaration of value.split(
			';'
		)
	) {
		const separatorIndex =
			declaration.indexOf(
				':'
			);

		if (
			separatorIndex < 0
		) {
			continue;
		}

		const property =
			declaration
				.slice(
					0,
					separatorIndex
				)
				.trim()
				.toLowerCase();

		const propertyValue =
			declaration
				.slice(
					separatorIndex + 1
				)
				.trim()
				.toLowerCase();

		if (
			property &&
			propertyValue
		) {
			declarations.set(
				property,
				propertyValue
			);
		}
	}

	return declarations;
}
