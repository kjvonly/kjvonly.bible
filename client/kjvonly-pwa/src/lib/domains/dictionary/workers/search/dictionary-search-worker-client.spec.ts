import { describe, expect, it, vi } from 'vitest';
import {
	DictionarySearchWorkerClient,
	type DictionarySearchWorkerPort
} from './dictionary-search-worker-client';
import type {
	DictionarySearchWorkerRequest,
	DictionarySearchWorkerResponse
} from './dictionary-search-worker-message';

const a = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

class FakePort {
	readonly posted: DictionarySearchWorkerRequest[] = [];
	readonly terminate = vi.fn();
	private readonly callbacks = new Map<string, Function>();
	postMessage(message: DictionarySearchWorkerRequest): void { this.posted.push(structuredClone(message)); }
	addEventListener(name: string, callback: Function): void { this.callbacks.set(name, callback); }
	emit(response: DictionarySearchWorkerResponse): void { this.emitRaw(response); }
	emitRaw(response: unknown): void { this.callbacks.get('message')?.({ data: response }); }
	emitError(error: Error): void { this.callbacks.get('error')?.({ error, message: error.message }); }
	emitMessageError(): void { this.callbacks.get('messageerror')?.({}); }
}

describe('DictionarySearchWorkerClient', () => {
	it('copies reactive source identities before searching', async () => {
		const port = new FakePort();
		const client = new DictionarySearchWorkerClient(() => port as unknown as DictionarySearchWorkerPort);
		const proxiedSource = new Proxy({ ...a }, {});
		expect(() => structuredClone(proxiedSource)).toThrow();

		const searching = client.search('ab', proxiedSource);
		expect(port.posted[0]).toMatchObject({ type: 'search', query: 'ab', source: a });
		port.emit({ id: port.posted[0]!.id, type: 'search-results', matches: [] });
		await expect(searching).resolves.toEqual({ matches: [] });
		client.dispose();
	});

	it('creates one worker lazily and correlates overlapping responses', async () => {
		const worker = new FakePort();
		const factory = vi.fn(() => worker as unknown as DictionarySearchWorkerPort);
		const client = new DictionarySearchWorkerClient(factory);
		expect(factory).not.toHaveBeenCalled();
		const one = client.search('a', a);
		const two = client.search('ab', a);
		expect(factory).toHaveBeenCalledTimes(1);
		const [req1, req2] = worker.posted;
		expect(req1).toMatchObject({ type: 'search', query: 'a', source: a });
		expect(req2).toMatchObject({ type: 'search', query: 'ab', source: a });
		worker.emit({ id: req2!.id, type: 'search-results', matches: [] });
		worker.emit({ id: req1!.id, type: 'search-results', matches: [] });
		await expect(one).resolves.toEqual({ matches: [] });
		await expect(two).resolves.toEqual({ matches: [] });
		client.dispose();
		expect(worker.terminate).toHaveBeenCalledOnce();
	});

	it('keeps overlapping requests for different editions correlated in one worker', async () => {
		const worker = new FakePort();
		const client = new DictionarySearchWorkerClient(() => worker as unknown as DictionarySearchWorkerPort);
		const other = { ...a, resourceId: 'kjvonly/dictionary/entries/webster-1844' };
		const first = client.search('ab', a);
		const second = client.search('ab', other);
		expect(worker.posted.map(request => request.source)).toEqual([a, other]);
		const newer = { ...other, headwordKey: 'abacus' };
		const older = { ...a, headwordKey: 'abandon' };
		worker.emit({ id: worker.posted[1]!.id, type: 'search-results', matches: [newer] });
		worker.emit({ id: worker.posted[0]!.id, type: 'search-results', matches: [older] });
		await expect(first).resolves.toEqual({ matches: [older] });
		await expect(second).resolves.toEqual({ matches: [newer] });
		client.dispose();
	});

	it('rejects a failed search response while keeping later searches available', async () => {
		const worker = new FakePort();
		const client = new DictionarySearchWorkerClient(() => worker as unknown as DictionarySearchWorkerPort);
		const failed = client.search('ab', a);
		worker.emit({ id: worker.posted[0]!.id, type: 'error', error: 'Index unavailable' });
		await expect(failed).rejects.toThrow('Index unavailable');

		const retried = client.search('abc', a);
		worker.emit({ id: worker.posted[1]!.id, type: 'search-results', matches: [] });
		await expect(retried).resolves.toEqual({ matches: [] });
		client.dispose();
	});

	it.each(['error', 'messageerror'] as const)(
		'ignores a late %s event from a failed worker after replacement', async eventType => {
			const failed = new FakePort();
			const replacement = new FakePort();
			const factory = vi.fn()
				.mockReturnValueOnce(failed as unknown as DictionarySearchWorkerPort)
				.mockReturnValueOnce(replacement as unknown as DictionarySearchWorkerPort);
			const client = new DictionarySearchWorkerClient(factory);

			const initial = client.search('a', a);
			failed.emitError(new Error('Worker crashed'));
			await expect(initial).rejects.toThrow('Worker crashed');
			expect(failed.terminate).toHaveBeenCalledOnce();

			const recovered = client.search('ab', a);
			expect(factory).toHaveBeenCalledTimes(2);
			if (eventType === 'error') failed.emitError(new Error('Late error'));
			else failed.emitMessageError();
			expect(replacement.terminate).not.toHaveBeenCalled();

			replacement.emit({
				id: replacement.posted[0]!.id, type: 'search-results', matches: []
			});
			await expect(recovered).resolves.toEqual({ matches: [] });
			client.dispose();
			expect(replacement.terminate).toHaveBeenCalledOnce();
		}
	);

	it.each([
		null,
		{ type: 'search-results', matches: [] },
		{ id: 5, type: 'search-results', matches: [] }
	])('rejects pending searches and restarts after a malformed worker message: %j', async response => {
		const failed = new FakePort();
		const replacement = new FakePort();
		const factory = vi.fn()
			.mockReturnValueOnce(failed as unknown as DictionarySearchWorkerPort)
			.mockReturnValueOnce(replacement as unknown as DictionarySearchWorkerPort);
		const client = new DictionarySearchWorkerClient(factory);
		const pending = client.search('ab', a);
		failed.emitRaw(response);
		await expect(pending).rejects.toThrow('malformed response');
		expect(failed.terminate).toHaveBeenCalledOnce();

		const recovered = client.search('abc', a);
		expect(factory).toHaveBeenCalledTimes(2);
		replacement.emit({ id: replacement.posted[0]!.id, type: 'search-results', matches: [] });
		await expect(recovered).resolves.toEqual({ matches: [] });
		client.dispose();
	});

	it('rejects pending requests on disposal and does not create another worker', async () => {
		const worker = new FakePort();
		const factory = vi.fn(() => worker as unknown as DictionarySearchWorkerPort);
		const client = new DictionarySearchWorkerClient(factory);
		const pending = client.search('a', a);
		client.dispose();
		await expect(pending).rejects.toThrow('disposed');
		await expect(client.search('a', a)).rejects.toThrow('disposed');
		expect(factory).toHaveBeenCalledTimes(1);
		worker.emit({ id: worker.posted[0]!.id, type: 'search-results', matches: [] });
	});
});
