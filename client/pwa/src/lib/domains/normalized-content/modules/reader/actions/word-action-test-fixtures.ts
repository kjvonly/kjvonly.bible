import type { NormalizedDocument } from '@kjvonly/normalized-content';
import type { ResourceDescriptor } from '$lib/resource';
import {
	NORMALIZED_DOCUMENT_DATA_TYPE,
	NORMALIZED_DOCUMENT_DATA_VERSION
} from '../../../resources/normalized-content-resource-contract';
import type { ReaderWordActionEnvironment } from './word-action-ports';

export const word = { blockId: 'paragraph', contentIndex: 0 };
export const invalidWord = { blockId: 'paragraph', contentIndex: 1 };

const document: NormalizedDocument = {
	blocks: [{ type: 'paragraph', id: 'paragraph', content: [
		{ type: 'word', text: 'Truth' },
		{ type: 'anchor', id: 'internal' }
	] }]
};

const descriptor: ResourceDescriptor = {
	metadata: {
		publisher: 'source', resourceId: 'normalized/document',
		resourceType: 'normalized-content/document',
		dataType: NORMALIZED_DOCUMENT_DATA_TYPE,
		dataVersion: NORMALIZED_DOCUMENT_DATA_VERSION,
		modifiedAt: 1,
		representation: 'content', mediaType: 'application/json'
	},
	strategy: { type: 'test', data: null }
};

export function wordActionEnvironment() {
	let current: ReaderWordActionEnvironment = { descriptor, document, publisher: 'owner' };
	return {
		read: () => current,
		change: (value: Partial<ReaderWordActionEnvironment>) => { current = { ...current, ...value }; }
	};
}

export function deferred() {
	let resolve!: () => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}
