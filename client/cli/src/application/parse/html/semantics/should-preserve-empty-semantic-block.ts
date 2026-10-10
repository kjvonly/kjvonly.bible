import type {
	Element
} from 'domhandler';

import {
	projectNormalizedClasses
} from '../projection/html-normalized-class-projector.js';

/**
 * Returns whether dropping an otherwise-empty supported semantic element would
 * discard canonical metadata that NormalizedDocument v1 can preserve.
 *
 * Source IDs preserve addressability. Supported normalized presentation also
 * survives normalization, so an empty block carrying either must still exist.
 * Arbitrary source classes/styles do not make an empty block canonical.
 * This is a decision for supported semantic block boundaries, not for positional
 * table rows/cells or flattened wrappers such as `div`.
 *
 * @param element Supported block element whose otherwise-empty output is considered.
 * @returns Whether a source ID or projected canonical presentation requires a block.
 */
export function shouldPreserveEmptySemanticBlock(
	element: Element
): boolean {
	return Boolean(
		element.attribs.id
	) ||
		projectNormalizedClasses(
			element
		) !== undefined;
}
