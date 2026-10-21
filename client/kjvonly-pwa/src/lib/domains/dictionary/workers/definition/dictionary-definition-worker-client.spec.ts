import { describe, expect, it, vi } from 'vitest';
import { DictionaryDefinitionWorkerClient, type DictionaryDefinitionWorkerPort } from './dictionary-definition-worker-client';
import type { DictionaryDefinitionWorkerRequest, DictionaryDefinitionWorkerResponse } from './dictionary-definition-worker-message';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

class FakeWorker implements DictionaryDefinitionWorkerPort {
	readonly sent: DictionaryDefinitionWorkerRequest[] = [];
	readonly terminate = vi.fn();
	private readonly listeners = new Map<string, Function>();
	postMessage(message: DictionaryDefinitionWorkerRequest): void { this.sent.push(structuredClone(message)); }
	addEventListener(name: string, listener: Function): void { this.listeners.set(name, listener); }
	emit(response: DictionaryDefinitionWorkerResponse): void { this.emitRaw(response); }
	emitRaw(response: unknown): void { this.listeners.get('message')?.({ data: response }); }
	emitError(error: Error): void { this.listeners.get('error')?.({ error, message: error.message }); }
	emitMessageError(): void { this.listeners.get('messageerror')?.({}); }
}

const normalizedBytes = (word: string): ArrayBuffer => new TextEncoder().encode(
	JSON.stringify({ blocks: [{ id: word, type: 'paragraph' }] })
).buffer;

describe('DictionaryDefinitionWorkerClient', () => {
	it('copies a reactive source identity before requesting normalized definitions', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const proxiedSource = new Proxy({ ...source }, {});
		expect(() => structuredClone(proxiedSource)).toThrow();

		const pending = client.getNormalized(proxiedSource, 'aam');
		expect(worker.sent[0]).toMatchObject({
			type: 'get-normalized-definition', source, headwordKey: 'aam'
		});
		worker.emit({
			id: worker.sent[0]!.id,
			type: 'normalized-ready',
			bytes: new TextEncoder().encode(JSON.stringify({ blocks: [] })).buffer
		});
		await expect(pending).resolves.toEqual({ blocks: [] });
		client.dispose();
	});

	it('starts lazily and correlates overlapping normalized-definition replies', async () => {
		const worker = new FakeWorker();
		const factory = vi.fn(() => worker);
		const client = new DictionaryDefinitionWorkerClient(factory);
		expect(factory).not.toHaveBeenCalled();
		const first = client.getNormalized(source, 'abandon');
		const second = client.getNormalized(source, 'ability');
		expect(factory).toHaveBeenCalledOnce();
		expect(worker.sent).toMatchObject([
			{ type: 'get-normalized-definition', source, headwordKey: 'abandon' },
			{ type: 'get-normalized-definition', source, headwordKey: 'ability' }
		]);
		worker.emit({ id: worker.sent[1]!.id, type: 'normalized-ready', bytes: normalizedBytes('ability') });
		worker.emit({ id: worker.sent[0]!.id, type: 'normalized-ready', bytes: normalizedBytes('abandon') });
		await expect(first).resolves.toEqual({ blocks: [{ id: 'abandon', type: 'paragraph' }] });
		await expect(second).resolves.toEqual({ blocks: [{ id: 'ability', type: 'paragraph' }] });
		client.dispose();
		expect(worker.terminate).toHaveBeenCalledOnce();
	});

	it('requests normalized documents without sending entire chunks to the UI', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const pending = client.getNormalized(source, 'aam');
		expect(worker.sent).toMatchObject([
			{ type: 'get-normalized-definition', source, headwordKey: 'aam' }
		]);
		const document = { blocks: [{ id: 'paragraph-1', type: 'paragraph' }] };
		const bytes = new TextEncoder().encode(JSON.stringify(document)).buffer;
		worker.emit({ id: worker.sent[0]!.id, type: 'normalized-ready', bytes });
		await expect(pending).resolves.toEqual(document);
		client.dispose();
	});

	it('rejects an unsupported worker response type', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const pending = client.getNormalized(source, 'aam');
		worker.emit({ id: worker.sent[0]!.id, type: 'unsupported-ready', bytes: normalizedBytes('aam') } as unknown as DictionaryDefinitionWorkerResponse);
		await expect(pending).rejects.toThrow('Unexpected Dictionary definition worker response');
		client.dispose();
	});

	it('rejects malformed normalized worker responses', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const pending = client.getNormalized(source, 'aam');
		const bytes = new TextEncoder().encode(JSON.stringify({ content: '<p>unvalidated</p>' })).buffer;
		worker.emit({ id: worker.sent[0]!.id, type: 'normalized-ready', bytes });
		await expect(pending).rejects.toThrow('Invalid normalized Dictionary definition response');
		client.dispose();
	});

	it('propagates worker errors without hiding other concurrent requests', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const first = client.getNormalized(source, 'missing');
		const second = client.getNormalized(source, 'abandon');
		worker.emit({ id: worker.sent[0]!.id, type: 'error', error: 'missing word' });
		worker.emit({ id: worker.sent[1]!.id, type: 'normalized-ready', bytes: normalizedBytes('abandon') });
		await expect(first).rejects.toThrow('missing word');
		await expect(second).resolves.toEqual({ blocks: [{ id: 'abandon', type: 'paragraph' }] });
		client.dispose();
	});

	it.each(['error', 'messageerror'] as const)(
		'ignores a late %s event from a failed definition worker after replacement', async eventType => {
			const failed = new FakeWorker();
			const replacement = new FakeWorker();
			const factory = vi.fn()
				.mockReturnValueOnce(failed)
				.mockReturnValueOnce(replacement);
			const client = new DictionaryDefinitionWorkerClient(factory);

			const initial = client.getNormalized(source, 'abandon');
			failed.emitError(new Error('Worker crashed'));
			await expect(initial).rejects.toThrow('Worker crashed');
			expect(failed.terminate).toHaveBeenCalledOnce();

			const recovered = client.getNormalized(source, 'ability');
			expect(factory).toHaveBeenCalledTimes(2);
			if (eventType === 'error') failed.emitError(new Error('Late error'));
			else failed.emitMessageError();
			expect(replacement.terminate).not.toHaveBeenCalled();

			replacement.emit({
				id: replacement.sent[0]!.id, type: 'normalized-ready', bytes: normalizedBytes('ability')
			});
			await expect(recovered).resolves.toEqual({ blocks: [{ id: 'ability', type: 'paragraph' }] });
			client.dispose();
			expect(replacement.terminate).toHaveBeenCalledOnce();
		}
	);

	it.each([
		null,
		{ type: 'normalized-ready', bytes: normalizedBytes('abandon') },
		{ id: 5, type: 'normalized-ready', bytes: normalizedBytes('abandon') }
	])('rejects pending definitions and restarts after a malformed worker message: %j', async response => {
		const failed = new FakeWorker();
		const replacement = new FakeWorker();
		const factory = vi.fn().mockReturnValueOnce(failed).mockReturnValueOnce(replacement);
		const client = new DictionaryDefinitionWorkerClient(factory);
		const pending = client.getNormalized(source, 'abandon');
		failed.emitRaw(response);
		await expect(pending).rejects.toThrow('malformed response');
		expect(failed.terminate).toHaveBeenCalledOnce();

		const recovered = client.getNormalized(source, 'ability');
		expect(factory).toHaveBeenCalledTimes(2);
		replacement.emit({ id: replacement.sent[0]!.id, type: 'normalized-ready', bytes: normalizedBytes('ability') });
		await expect(recovered).resolves.toEqual({ blocks: [{ id: 'ability', type: 'paragraph' }] });
		client.dispose();
	});

	it('rejects pending work and refuses new requests after disposal', async () => {
		const worker = new FakeWorker();
		const client = new DictionaryDefinitionWorkerClient(() => worker);
		const pending = client.getNormalized(source, 'abandon');
		client.dispose();
		await expect(pending).rejects.toThrow('disposed');
		await expect(client.getNormalized(source, 'ability')).rejects.toThrow('disposed');
		expect(worker.terminate).toHaveBeenCalledOnce();
	});
});
