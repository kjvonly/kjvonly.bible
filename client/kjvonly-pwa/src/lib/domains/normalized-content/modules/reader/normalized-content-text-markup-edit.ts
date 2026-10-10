import type {
	NormalizedDocument
} from '@kjvonly/normalized-content';

import type {
	NormalizedContentAddress
} from '../../models/normalized-content-address.model';
import {
	resolveNormalizedContentAtAddress
} from '../../models/normalized-content-address.model';
import type {
	NormalizedContentTextMarkupMap,
	NormalizedContentTextMarkupMarking
} from '../../models/normalized-content-text-markup.model';
import {
	getNormalizedContentTextMarkupMarking
} from '../../models/normalized-content-text-markup.model';

export interface NormalizedContentTextMarkupEditSelection {
	readonly type: string;
	readonly colorMarkup: string;
}

/**
 * Toggles the selected markup family for one canonical normalized word.
 *
 * @param document NormalizedDocument snapshot that owns the target address.
 * @param markings Mutable Text Markup draft keyed by semantic token address.
 * @param address Exact `blockId + contentIndex` word address to mutate.
 * @param selection Currently selected markup family/value.
 */
export function toggleNormalizedContentTextMarkupWord(
	document: NormalizedDocument,
	markings: NormalizedContentTextMarkupMap,
	address: NormalizedContentAddress,
	selection: NormalizedContentTextMarkupEditSelection
): void {
	assertWordAddress(
		document,
		address
	);

	const marking = requireWordMarking(
		markings,
		address
	);

	if (hasMarkupFamily(marking, selection.type)) {
		removeMarkupFamily(marking, selection.type);
		return;
	}

	addSelectedMarkup(marking, selection);
}

/**
 * Applies the selected markup family to one canonical normalized word without
 * toggling it off.
 *
 * @param document NormalizedDocument snapshot that owns the target address.
 * @param markings Mutable Text Markup draft keyed by semantic token address.
 * @param address Exact `blockId + contentIndex` word address to mutate.
 * @param selection Currently selected markup family/value.
 */
export function applyNormalizedContentTextMarkupWord(
	document: NormalizedDocument,
	markings: NormalizedContentTextMarkupMap,
	address: NormalizedContentAddress,
	selection: NormalizedContentTextMarkupEditSelection
): void {
	assertWordAddress(
		document,
		address
	);

	const marking = requireWordMarking(
		markings,
		address
	);

	removeMarkupFamily(marking, selection.type);
	addSelectedMarkup(marking, selection);
}

/**
 * Removes the selected markup family from one canonical normalized word when
 * present.
 *
 * @param document NormalizedDocument snapshot that owns the target address.
 * @param markings Mutable Text Markup draft keyed by semantic token address.
 * @param address Exact `blockId + contentIndex` word address to mutate.
 * @param selection Currently selected markup family/value.
 */
export function removeNormalizedContentTextMarkupWord(
	document: NormalizedDocument,
	markings: NormalizedContentTextMarkupMap,
	address: NormalizedContentAddress,
	selection: NormalizedContentTextMarkupEditSelection
): void {
	assertWordAddress(
		document,
		address
	);

	const marking =
		getNormalizedContentTextMarkupMarking(
			markings,
			address
		);

	if (!marking) {
		return;
	}

	removeMarkupFamily(marking, selection.type);
}

/**
 * Verifies that Text Markup is being applied only to canonical word content.
 *
 * `contentIndex` indexes all inline entries, including zero-width anchors and
 * line breaks, so callers must not infer markability from the numeric address
 * alone.
 */
function assertWordAddress(
	document: NormalizedDocument,
	address: NormalizedContentAddress
): void {
	const content =
		resolveNormalizedContentAtAddress(
			document,
			address
		);

	if (content?.type !== 'word') {
		throw new Error(
			'Normalized Content Text Markup target must resolve to a word: ' +
			`${address.blockId}/${address.contentIndex}`
		);
	}
}

function requireWordMarking(
	markings: NormalizedContentTextMarkupMap,
	address: NormalizedContentAddress
): NormalizedContentTextMarkupMarking {
	let blockMarkings = getOwnBlockMarkings(
		markings,
		address.blockId
	);

	if (!blockMarkings) {
		blockMarkings = setOwnEnumerableProperty(
			markings,
			address.blockId,
			{}
		);
	}

	const key = String(address.contentIndex);
	let marking = getOwnProperty(
		blockMarkings,
		key
	);

	if (!marking) {
		marking = setOwnEnumerableProperty(
			blockMarkings,
			key,
			{
				class: []
			}
		);
	}

	return marking;
}

function getOwnBlockMarkings(
	markings: NormalizedContentTextMarkupMap,
	blockId: string
): NormalizedContentTextMarkupMap[string] | undefined {
	return getOwnProperty(
		markings,
		blockId
	);
}

function getOwnProperty<T>(
	record: Record<string, T>,
	key: string
): T | undefined {
	if (!Object.prototype.hasOwnProperty.call(record, key)) {
		return undefined;
	}

	return record[key];
}

/**
 * Adds an own JSON-serializable key through normal assignment so Svelte's
 * deep-state proxy observes newly created markup entries.
 *
 * `__proto__` is defined as an own data property first so the assignment does
 * not invoke the legacy prototype setter. The placeholder intentionally differs
 * from `value`, ensuring the following assignment crosses the reactive `set`
 * boundary even for that special key.
 *
 * The stored value is read back because a reactive proxy may wrap nested plain
 * objects when they are assigned into state.
 */
function setOwnEnumerableProperty<T>(
	record: Record<string, T>,
	key: string,
	value: T
): T {
	if (
		key === '__proto__' &&
		!Object.prototype.hasOwnProperty.call(record, key)
	) {
		Object.defineProperty(
			record,
			key,
			{
				configurable: true,
				enumerable: true,
				value: undefined,
				writable: true
			}
		);
	}

	record[key] = value;

	return record[key];
}

function hasMarkupFamily(
	marking: NormalizedContentTextMarkupMarking,
	type: string
): boolean {
	return marking.class.some(
		(className) => className.startsWith(type)
	);
}

function removeMarkupFamily(
	marking: NormalizedContentTextMarkupMarking,
	type: string
): void {
	const classes = marking.class.filter(
		(className) => !className.startsWith(type)
	);

	if (type === 'decoration') {
		const filtered = classes.filter(
			(className) => className !== 'underline'
		);
		marking.class.splice(
			0,
			marking.class.length,
			...filtered
		);
		return;
	}

	marking.class.splice(
		0,
		marking.class.length,
		...classes
	);
}

function addSelectedMarkup(
	marking: NormalizedContentTextMarkupMarking,
	selection: NormalizedContentTextMarkupEditSelection
): void {
	marking.class.push(selection.colorMarkup);

	if (selection.type === 'decoration') {
		marking.class.push(
			'underline',
			'decoration-solid'
		);
	}
}
