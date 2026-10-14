import {
	isNormalizedClassName,
	type NormalizedBlock,
	type NormalizedClassName,
	type NormalizedContent,
	type NormalizedDocument,
	type NormalizedHeadingLevel,
	type NormalizedDocumentValidator
} from '@kjvonly/normalized-content';

import {
	OrdinalNormalizedBlockIdGenerator
} from '../identity/ordinal-normalized-block-id-generator.js';

/** A value decoded from untrusted, historical normalized-document JSON. */
type LegacyValue = unknown;
type LegacyRecord = Record<string, LegacyValue>;

/**
 * Migrates the first-generation PDF-extraction document structure into the
 * currently validated canonical document contract.
 *
 * This conversion is intentionally strict: it never re-tokenizes words,
 * guesses list numbering, or silently ignores an unknown block type. It is
 * independent of filesystem traversal and CLI commands.
 */
export class LegacyNormalizedDocumentConverter {
	constructor(
		private readonly validator: Pick<NormalizedDocumentValidator, 'validate'>
	) {}

	/** Convert one entire legacy document, rejecting ambiguity before accepting output. */
	convert(input: LegacyValue): NormalizedDocument {
		const root = requireRecord(input, 'document');
		assertOnlyKeys(root, ['source', 'blocks'], 'document');
		const ids = new OrdinalNormalizedBlockIdGenerator();
		const authoredIds: string[] = [];
		collectAuthoredBlockIds(root.blocks, authoredIds, 'blocks');
		ids.reserveSourceIds(authoredIds, 'legacy block id');

		const result: { blocks: NormalizedDocument['blocks']; source?: string } = {
			blocks: this.convertBlocks(requireArray(root.blocks, 'blocks'), ids, 'blocks') as NormalizedDocument['blocks']
		};
		if (root.source !== undefined && root.source !== null) {
			result.source = requireString(root.source, 'source');
		}
		return this.validator.validate(result);
	}

	/** Convert recursive blocks in their original order without flattening structure. */
	private convertBlocks(
		input: LegacyValue[],
		ids: OrdinalNormalizedBlockIdGenerator,
		path: string
	): NormalizedBlock[] {
		return input.map((entry, index): NormalizedBlock => {
			const at = `${path}[${index}]`;
			const old = requireRecord(entry, at);
			const type = requireString(old.type, `${at}.type`) as NormalizedBlock['type'];
			assertBlockFields(old, type, at);
			const id = ids.createId(type, optionalString(old.id, `${at}.id`));
			const classes = projectClasses(old.class, `${at}.class`);
			const common = { id, ...(classes ? { class: classes } : {}) };

			switch (type) {
				case 'heading':
					return {
						...common, type,
						level: requireHeadingLevel(old.level, `${at}.level`),
						content: convertContent(old, at)
					};
				case 'paragraph':
					return { ...common, type, content: convertContent(old, at) };
				case 'text':
					return { ...common, type, content: convertContent(old, at) };
				case 'caption':
					// First-generation captions carried inline text; canonical captions
					// instead own flow blocks. Preserve the original tokens in a text block.
					return {
						...common, type,
						blocks: [{
							type: 'text',
							id: ids.createId('text'),
							content: convertContent(old, at)
						}]
					};
				case 'preformatted':
					return { ...common, type, content: convertContent(old, at) };
				case 'thematic-break':
					return { ...common, type };
				case 'quote':
					return {
						...common, type,
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							FLOW_BLOCK_TYPES, at
						)
					};
				case 'list-item':
					return {
						...common, type,
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							FLOW_BLOCK_TYPES, at
						)
					};
				case 'table-cell':
					return {
						...common, type,
						// Unspecified legacy header metadata defaults to data-cell semantics.
						// Explicit header semantics must survive when present.
						header: old.header == null ? false : requireBoolean(old.header, `${at}.header`),
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							FLOW_BLOCK_TYPES, at
						)
					};
				case 'figure':
					return {
						...common, type,
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							[...FLOW_BLOCK_TYPES, 'caption'], at
						)
					};
				case 'table':
					return {
						...common, type,
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							['caption', 'table-row'], at
						)
					};
				case 'table-row':
					return {
						...common, type,
						blocks: requireChildTypes(
							this.convertBlocks(requireArray(old.blocks, `${at}.blocks`), ids, `${at}.blocks`),
							['table-cell'], at
						)
					};
				case 'list': {
					const children = requireArray(old.blocks, `${at}.blocks`);
					const ordered = requireBoolean(old.ordered, `${at}.ordered`);
					const converted = requireChildTypes(
						this.convertBlocks(children, ids, `${at}.blocks`),
						['list-item'], at
					);
					// The canonical reader generates markers for ordered lists. If the
					// source markers are not the exact 1-based sequence, retain every
					// literal marker in an unbulleted unordered list instead.
					const nativeMarkers = ordered
						? normalizeSequentialListMarkers(children, converted, classes ?? [], at)
						: false;
					return {
						...common, type,
						ordered: ordered && nativeMarkers,
						blocks: converted
					};
				}
				default:
					throw new Error(`${at}: unsupported legacy block type ${JSON.stringify(type)}.`);
			}
		});
	}
}

/** Canonical ordinary-flow types; context-only blocks cannot leak into flow. */
const FLOW_BLOCK_TYPES = [
	'heading', 'paragraph', 'text', 'preformatted', 'thematic-break',
	'quote', 'list', 'figure', 'table'
] as const;

/** Narrow structural children only after verifying their canonical context. */
function requireChildTypes<T extends NormalizedBlock['type']>(
	blocks: NormalizedBlock[],
	types: readonly T[],
	path: string
): Extract<NormalizedBlock, { type: T }>[] {
	const valid = new Set<string>(types);
	for (const [index, block] of blocks.entries()) {
		if (!valid.has(block.type)) {
			throw new Error(`${path}.blocks[${index}]: invalid ${block.type} child.`);
		}
	}
	return blocks as Extract<NormalizedBlock, { type: T }>[];
}

/**
 * Match the authoritative legacy text against the original inline units.
 * This establishes exact adjacency rather than inferring spacing from punctuation.
 * The duplicate text field is then discarded from canonical output.
 */
function convertContent(block: LegacyRecord, path: string): NormalizedContent[] {
	const text = requireString(block.text, `${path}.text`);
	const units = requireArray(block.content, `${path}.content`);
	let offset = 0;
	let previousWasWord = false;
	const result = units.map((unit, index): NormalizedContent => {
		const at = `${path}.content[${index}]`;
		const old = requireRecord(unit, at);
		const type = requireString(old.type, `${at}.type`);
		if (type === 'line-break') {
			assertOnlyKeys(old, ['type'], at);
			while (offset < text.length && /[ \t\r]/.test(text[offset]!)) offset++;
			if (text[offset] !== '\n') {
				throw new Error(`${at}: line break differs from legacy text.`);
			}
			offset++;
			previousWasWord = false;
			return { type: 'line-break' };
		}
		if (type !== 'word') {
			throw new Error(`${at}: unsupported legacy inline type ${JSON.stringify(type)}.`);
		}
		assertOnlyKeys(old, ['type', 'text', 'class', 'href', 'emphasis', 'strong', 'marks'], at);
		const word = requireString(old.text, `${at}.text`);
		const start = offset;
		while (offset < text.length && /\s/.test(text[offset]!)) offset++;
		if (!text.startsWith(word, offset)) {
			throw new Error(`${at}: word ${JSON.stringify(word)} does not match legacy text.`);
		}
		const joinPrevious = previousWasWord && start === offset;
		offset += word.length;
		previousWasWord = true;
		const output: Extract<NormalizedContent, { type: 'word' }> = {
			type: 'word', text: word,
			...(joinPrevious ? { joinPrevious: true } : {})
		};
		for (const flag of ['emphasis', 'strong'] as const) {
			if (old[flag] === true) output[flag] = true;
			else if (old[flag] !== false && old[flag] !== null && old[flag] !== undefined) {
				throw new Error(`${at}.${flag}: expected a boolean.`);
			}
		}
		for (const key of ['href', 'marks'] as const) {
			if (old[key] !== null && old[key] !== undefined) {
				const values = requireArray(old[key], `${at}.${key}`)
					.map((v, i) => requireString(v, `${at}.${key}[${i}]`));
				if (values.length) {
					if (key === 'href') output.href = values;
					else output.marks = values as NonNullable<typeof output.marks>;
				}
			}
		}
		const classes = projectClasses(old.class, `${at}.class`);
		if (classes) output.class = classes;
		return output;
	});
	if (text.slice(offset).trim()) {
		throw new Error(`${path}.text: trailing text not represented in tokens.`);
	}
	return result;
}

/**
 * Replace authored markers with native ordered-list markers only if ALL list
 * items match the complete 1-based Roman/decimal sequence. For non-1 starts,
 * repeated ordinals, missing markers, or irregular numbering, leave every token
 * untouched and render an unordered list without generated bullets. The list
 * retains its canonical list-style hint to distinguish literal markers from
 * ordinary bulleted unordered lists.
 *
 * The analysis pass must finish before stripping any marker: partial removal
 * would corrupt a list if a later item contains unexpected numbering.
 */
function normalizeSequentialListMarkers(
	originalItems: LegacyValue[],
	convertedItems: NormalizedBlock[],
	classes: readonly string[],
	path: string
): boolean {
	const roman = classes.includes('list-roman');
	const arabic = classes.includes('list-arabic');
	if (roman === arabic) {
		throw new Error(`${path}: ordered legacy list has no unambiguous marker style.`);
	}
	if (originalItems.length === 0) return true;
	const firstTexts: { content: NormalizedContent[] }[] = [];
	for (let index = 0; index < originalItems.length; index++) {
		const at = `${path}.blocks[${index}]`;
		const item = requireRecord(originalItems[index], at);
		if (item.type !== 'list-item') throw new Error(`${at}: expected list-item.`);
		const first = requireArray(item.blocks, `${at}.blocks`)[0];
		const firstBlock = first === undefined ? undefined : requireRecord(first, `${at}.blocks[0]`);
		const tokens = firstBlock?.content === undefined
			? [] : requireArray(firstBlock.content, `${at}.blocks[0].content`);
		const marker = tokens[0] === undefined
			? undefined : requireRecord(tokens[0], `${at}.blocks[0].content[0]`);
		const expected = roman ? `${romanNumeral(index + 1)}.` : `${index + 1}.`;
		const canonical = convertedItems[index];
		if (marker?.type !== 'word' || marker.text !== expected ||
			canonical?.type !== 'list-item' || canonical.blocks[0]?.type !== 'text') {
			return false;
		}
		const firstText = canonical.blocks[0];
		const markerWord = firstText.content[0];
		// Do not discard marker-only text blocks or authored links/marks on
		// marker tokens: native CSS counters cannot represent those semantics.
		if (firstText.content.length < 2 || markerWord?.type !== 'word' ||
			markerWord.href?.length || markerWord.marks?.length) {
			return false;
		}
		firstTexts.push(firstText);
	}
	for (const firstText of firstTexts) {
		firstText.content.shift();
		// Removing a number must not leave a whitespace-joining instruction.
		if (firstText.content[0]?.type === 'word') {
			delete firstText.content[0].joinPrevious;
		}
	}
	return true;
}

function romanNumeral(number: number): string {
	const parts: [number, string][] = [
		[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
		[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
	];
	let value = number;
	let result = '';
	for (const [size, symbol] of parts) {
		while (value >= size) { result += symbol; value -= size; }
	}
	return result;
}

/** Gather original IDs before assigning generated IDs so collisions cannot occur. */
function collectAuthoredBlockIds(value: LegacyValue, ids: string[], path: string): void {
	for (const [index, entry] of requireArray(value, path).entries()) {
		const at = `${path}[${index}]`;
		const old = requireRecord(entry, at);
		const id = optionalString(old.id, `${at}.id`);
		if (id) ids.push(id);
		if (old.blocks !== undefined) collectAuthoredBlockIds(old.blocks, ids, `${at}.blocks`);
	}
}

/** Only canonical semantics survive; source-specific presentation is discarded. */
function projectClasses(value: LegacyValue, path: string): NormalizedClassName[] | undefined {
	if (value === null || value === undefined) return undefined;
	const output = new Set<NormalizedClassName>();
	for (const [index, item] of requireArray(value, path).entries()) {
		const name = requireString(item, `${path}[${index}]`);
		if (name.startsWith('color-')) continue;
		if (isNormalizedClassName(name)) output.add(name);
		else if (!['quote-text', 'list-marker', 'list-marker-arabic', 'list-marker-roman'].includes(name)) {
			throw new Error(`${path}: unrecognized source class ${JSON.stringify(name)}.`);
		}
	}
	return output.size ? [...output] : undefined;
}

function requireRecord(value: LegacyValue, path: string): LegacyRecord {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${path}: expected an object.`);
	}
	return value as LegacyRecord;
}
function requireArray(value: LegacyValue, path: string): LegacyValue[] {
	if (!Array.isArray(value)) throw new Error(`${path}: expected an array.`);
	return value;
}
function requireString(value: LegacyValue, path: string): string {
	if (typeof value !== 'string') throw new Error(`${path}: expected a string.`);
	return value;
}
function optionalString(value: LegacyValue, path: string): string | undefined {
	return value === null || value === undefined ? undefined : requireString(value, path);
}
/** Enforce the canonical heading-level union before building a heading block. */
function requireHeadingLevel(value: LegacyValue, path: string): NormalizedHeadingLevel {
	switch (value) {
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
		case 6:
			return value;
		default:
			throw new Error(`${path}: expected a heading level between 1 and 6.`);
	}
}
function requireBoolean(value: LegacyValue, path: string): boolean {
	if (typeof value !== 'boolean') throw new Error(`${path}: expected a boolean.`);
	return value;
}

/** Legacy block fields are checked by kind so unhandled semantics cannot disappear. */
function assertBlockFields(block: LegacyRecord, type: string, path: string): void {
	const common = ['type', 'id', 'class'];
	if (type === 'heading') {
		assertOnlyKeys(block, [...common, 'level', 'text', 'content'], path);
	} else if (['paragraph', 'text', 'preformatted', 'caption'].includes(type)) {
		assertOnlyKeys(block, [...common, 'text', 'content'], path);
	} else if (type === 'list') {
		assertOnlyKeys(block, [...common, 'ordered', 'blocks'], path);
	} else if (type === 'table-cell') {
		assertOnlyKeys(block, [...common, 'blocks', 'header'], path);
	} else if (['quote', 'list-item', 'figure', 'table', 'table-row'].includes(type)) {
		assertOnlyKeys(block, [...common, 'blocks'], path);
	} else if (type === 'thematic-break') {
		assertOnlyKeys(block, common, path);
	}
}

/** Do not silently lose future legacy properties that the converter does not know. */
function assertOnlyKeys(value: LegacyRecord, keys: readonly string[], path: string): void {
	for (const key of Object.keys(value)) {
		if (!keys.includes(key)) {
			throw new Error(`${path}: unsupported legacy property ${JSON.stringify(key)}.`);
		}
	}
}
