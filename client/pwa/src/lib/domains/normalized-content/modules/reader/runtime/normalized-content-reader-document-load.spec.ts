import { describe, expect, it, vi } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import {
	retrieveAndCompleteNormalizedReaderDocument,
	type NormalizedReaderDocumentLoadSteps
} from './normalized-content-reader-document-load';

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((fulfill, fail) => { resolve = fulfill; reject = fail; });
	return { promise, resolve, reject };
}
function documentNamed(id: string): NormalizedDocument {
	return { blocks: [{ type: 'paragraph', id, content: [{ type: 'word', text: id }] }] };
}
function createSteps(isCurrent: () => boolean, retrieve: () => Promise<NormalizedDocument>): NormalizedReaderDocumentLoadSteps & {
	accept: ReturnType<typeof vi.fn>;
	reportError: ReturnType<typeof vi.fn>;
	complete: ReturnType<typeof vi.fn>;
} {
	return { isCurrent, retrieve, accept: vi.fn(), reportError: vi.fn(), complete: vi.fn(async () => {}) };
}

describe('Normalized Reader document retrieval', () => {
	it('accepts and completes the selected document exactly once', async () => {
		const doc = documentNamed('first');
		const steps = createSteps(() => true, async () => doc);
		await retrieveAndCompleteNormalizedReaderDocument(steps);
		expect(steps.accept).toHaveBeenCalledExactlyOnceWith(doc);
		expect(steps.reportError).not.toHaveBeenCalled();
		expect(steps.complete).toHaveBeenCalledTimes(1);
	});
	it('ignores a result for a different selected document identity', async () => {
		let selected = 'a';
		const pending = deferred<NormalizedDocument>();
		const steps = createSteps(() => selected === 'a', () => pending.promise);
		const load = retrieveAndCompleteNormalizedReaderDocument(steps);
		selected = 'b';
		pending.resolve(documentNamed('a'));
		await load;
		expect(steps.accept).not.toHaveBeenCalled();
		expect(steps.complete).not.toHaveBeenCalled();
	});
	it('accepts the last completed result when document identity is unchanged', async () => {
		const first = deferred<NormalizedDocument>();
		const second = deferred<NormalizedDocument>();
		const accepted: string[] = [];
		const firstSteps = createSteps(() => true, () => first.promise);
		const secondSteps = createSteps(() => true, () => second.promise);
		firstSteps.accept.mockImplementation((doc: NormalizedDocument) => accepted.push(doc.blocks[0].id));
		secondSteps.accept.mockImplementation((doc: NormalizedDocument) => accepted.push(doc.blocks[0].id));
		const a = retrieveAndCompleteNormalizedReaderDocument(firstSteps);
		const b = retrieveAndCompleteNormalizedReaderDocument(secondSteps);
		second.resolve(documentNamed('second'));
		await b;
		first.resolve(documentNamed('first'));
		await a;
		expect(accepted).toEqual(['second', 'first']);
	});
	it('waits for async completion and reports current failures', async () => {
		const completion = deferred<void>();
		const steps = createSteps(() => true, async () => documentNamed('first'));
		steps.complete.mockImplementation(() => completion.promise);
		let settled = false;
		const load = retrieveAndCompleteNormalizedReaderDocument(steps).then(() => { settled = true; });
		await Promise.resolve();
		expect(settled).toBe(false);
		completion.resolve(undefined);
		await load;
		expect(settled).toBe(true);
		const error = new Error('offline');
		const failed = createSteps(() => true, async () => { throw error; });
		await retrieveAndCompleteNormalizedReaderDocument(failed);
		expect(failed.reportError).toHaveBeenCalledExactlyOnceWith(error);
		expect(failed.complete).toHaveBeenCalledTimes(1);
	});
});
