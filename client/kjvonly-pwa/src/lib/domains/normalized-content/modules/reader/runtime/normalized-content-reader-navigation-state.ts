import {
	Modules,
	type NavigationState,
	type ResourceModuleOpenItem
} from '$lib/application';
import type { NormalizedDocumentBookmarkTarget } from '$lib/domains/bookmarks';
import { NORMALIZED_CONTENT_VIEWS } from '../../../models/normalized-content-navigation.model';

/**
 * Validate the Reader view and the basic descriptor/sequence shape before
 * reading persisted navigation state. This checks sequence bounds and item
 * structure, not the full ResourceDescriptor schema or Bookmark target;
 * the launch Bookmark is parsed separately by the Reader.
 *
 * @throws If the view identity or required navigation fields are invalid.
 */
export function validateNormalizedContentReaderNavigationState(
	value: unknown
): asserts value is NormalizedContentNavigationState {
	if (
		!isRecord(value) ||
		value.module !== Modules.NORMALIZED_CONTENT ||
		value.view !== NORMALIZED_CONTENT_VIEWS.READER ||
		!isRecord(value.state) ||
		!isRecord(value.state.descriptor) ||
		(value.state.sequence !== undefined && (
			!Array.isArray(value.state.sequence) ||
			value.state.sequence.length === 0 ||
			!Number.isInteger(value.state.sequenceIndex) ||
			(value.state.sequenceIndex as number) < 0 ||
			(value.state.sequenceIndex as number) >= value.state.sequence.length ||
			!value.state.sequence.every((item: unknown) =>
				isRecord(item) && isRecord(item.descriptor) &&
				typeof item.fileName === 'string'
			)
		))
	) {
		throw new Error(
			'Invalid Normalized Content navigation state'
		);
	}
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

type NormalizedContentNavigationState =
	NavigationState<
		typeof NORMALIZED_CONTENT_VIEWS.READER
	> & {
		readonly state: {
			readonly descriptor:
				Record<string, unknown>;
			readonly bookmarkTarget?: NormalizedDocumentBookmarkTarget;
			readonly fileName?: string;
			readonly sequence?: readonly ResourceModuleOpenItem[];
			readonly sequenceIndex?: number;
		};
	};
