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
 * omitted so one import corpus does not define the canonical class vocabulary.
 *
 * @param element Source HTML element whose presentation metadata is projected.
 * @returns Canonical class names when at least one presentation hint is represented.
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

/**
 * Returns source class names intentionally discarded by the generic projector.
 *
 * @param element Source HTML element whose class attribute is inspected.
 * @returns Source class names not represented in canonical normalized content.
 */
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

/** One valid source CSS declaration not represented by the current projector. */
export interface UnsupportedHtmlStyleDeclaration {
	/** Lowercase CSS property name. */
	readonly property: string;

	/** Lowercase CSS property value used by the current projection policy. */
	readonly value: string;
}

/**
 * Returns valid source style declarations whose presentation semantics are not
 * represented by the normalized-class projector.
 *
 * Malformed declarations are omitted because this boundary intentionally does
 * not implement a general CSS parser. Repeated properties retain the final
 * declaration, matching the projection behavior.
 *
 * @param element Source HTML element whose style attribute is inspected.
 * @returns Effective style declarations that would otherwise be silently lost.
 */
export function getUnsupportedSourceStyleDeclarations(
	element: Element
): UnsupportedHtmlStyleDeclaration[] {
	return [
		...parseStyle(
			element.attribs.style
		).entries()
	]
		.filter(
			([property, value]) =>
				!(
					property === 'text-align' &&
					value === 'center'
				)
		)
		.map(
			([property, value]) => ({
				property,
				value
			})
		)
		.sort(
			(left, right) =>
				`${left.property}:${left.value}`.localeCompare(
					`${right.property}:${right.value}`
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
