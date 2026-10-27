import { describe, expect, it, vi } from 'vitest';
import type { NormalizedDocument } from '@kjvonly/normalized-content';
import { DictionaryRuntime } from './dictionary-runtime';
import { DictionarySearchWorkerClient, type DictionarySearchWorkerPort } from '../workers/search/dictionary-search-worker-client';
import { DictionaryDefinitionWorkerClient, type DictionaryDefinitionWorkerPort } from '../workers/definition/dictionary-definition-worker-client';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

/** Construct fake clients while keeping the production runtime's session logic real. */
function createFixture() {
	const search = vi.fn().mockResolvedValue({ matches: [] });
	const get = vi.fn().mockResolvedValue({ number: 'G26' });
	const getNormalized = vi.fn().mockResolvedValue({ blocks: [] } as unknown as NormalizedDocument);
	const disposeSearch = vi.fn();
	const disposeDefinition = vi.fn();
	const createSearch = vi.fn(() => ({ search, dispose: disposeSearch }));
	const createDefinition = vi.fn(() => ({ get, getNormalized, dispose: disposeDefinition }));
	return {
		runtime: new DictionaryRuntime(createSearch, createDefinition),
		search, get, getNormalized, disposeSearch, disposeDefinition,
		createSearch, createDefinition
	};
}

describe('DictionaryRuntime', () => {
	it('starts both clients lazily and reuses them across mounted views and panes', async () => {
		const fixture = createFixture();
		const releaseRoot = fixture.runtime.acquire();
		const releaseEntry = fixture.runtime.acquire();
		expect(fixture.createSearch).not.toHaveBeenCalled();
		expect(fixture.createDefinition).not.toHaveBeenCalled();

		await fixture.runtime.search('a', source);
		await fixture.runtime.search('ab', source);
		await fixture.runtime.getNormalized(source, 'abandon');
		await fixture.runtime.getNormalized(source, 'ability');
		expect(fixture.createSearch).toHaveBeenCalledOnce();
		expect(fixture.createDefinition).toHaveBeenCalledOnce();
		expect(fixture.search).toHaveBeenCalledTimes(2);
		expect(fixture.getNormalized).toHaveBeenCalledTimes(2);

		releaseEntry();
		expect(fixture.disposeSearch).not.toHaveBeenCalled();
		expect(fixture.disposeDefinition).not.toHaveBeenCalled();
		releaseRoot();
		expect(fixture.disposeSearch).toHaveBeenCalledOnce();
		expect(fixture.disposeDefinition).toHaveBeenCalledOnce();
	});


	it('retrieves raw definitions without opening a Dictionary view and releases the temporary worker', async () => {
		const fixture = createFixture();
		await expect(fixture.runtime.get(source, 'G26')).resolves.toEqual({ number: 'G26' });
		expect(fixture.get).toHaveBeenCalledWith(source, 'G26');
		expect(fixture.createDefinition).toHaveBeenCalledOnce();
		expect(fixture.disposeDefinition).toHaveBeenCalledOnce();
		expect(fixture.createSearch).not.toHaveBeenCalled();
	});

	it('reuses the definition worker for raw and normalized lookup while a Dictionary view is mounted', async () => {
		const fixture = createFixture();
		const release = fixture.runtime.acquire();
		await fixture.runtime.get(source, 'G26');
		await fixture.runtime.getNormalized(source, 'abandon');
		expect(fixture.createDefinition).toHaveBeenCalledOnce();
		expect(fixture.disposeDefinition).not.toHaveBeenCalled();
		release();
		expect(fixture.disposeDefinition).toHaveBeenCalledOnce();
	});

	it('does not create workers if the Dictionary closes without a request', () => {
		const fixture = createFixture();
		fixture.runtime.acquire()();
		expect(fixture.createSearch).not.toHaveBeenCalled();
		expect(fixture.createDefinition).not.toHaveBeenCalled();
	});

	it('releases only once and starts fresh clients on a later Dictionary session', async () => {
		const fixture = createFixture();
		const release = fixture.runtime.acquire();
		await fixture.runtime.search('a', source);
		await fixture.runtime.getNormalized(source, 'abandon');
		release();
		release();
		expect(fixture.disposeSearch).toHaveBeenCalledOnce();
		expect(fixture.disposeDefinition).toHaveBeenCalledOnce();

		const releaseAgain = fixture.runtime.acquire();
		await fixture.runtime.search('b', source);
		await fixture.runtime.getNormalized(source, 'ability');
		expect(fixture.createSearch).toHaveBeenCalledTimes(2);
		expect(fixture.createDefinition).toHaveBeenCalledTimes(2);
		releaseAgain();
		expect(fixture.disposeSearch).toHaveBeenCalledTimes(2);
		expect(fixture.disposeDefinition).toHaveBeenCalledTimes(2);
	});

	it('rejects overlapping in-flight requests only after the last pane releases real worker clients', async () => {
		const searchPort = {
			postMessage: vi.fn(), addEventListener: vi.fn(), terminate: vi.fn()
		};
		const definitionPort = {
			postMessage: vi.fn(), addEventListener: vi.fn(), terminate: vi.fn()
		};
		const runtime = new DictionaryRuntime(
			() => new DictionarySearchWorkerClient(() => searchPort as unknown as DictionarySearchWorkerPort),
			() => new DictionaryDefinitionWorkerClient(() => definitionPort as unknown as DictionaryDefinitionWorkerPort)
		);
		const releaseFirst = runtime.acquire();
		const releaseSecond = runtime.acquire();

		const firstSearch = runtime.search('a', source);
		const secondSearch = runtime.search('ab', source);
		const definition = runtime.getNormalized(source, 'abandon');
		const settled = [
			expect(firstSearch).rejects.toThrow('disposed'),
			expect(secondSearch).rejects.toThrow('disposed'),
			expect(definition).rejects.toThrow('disposed')
		];
		expect(searchPort.postMessage).toHaveBeenCalledTimes(2);
		expect(definitionPort.postMessage).toHaveBeenCalledOnce();

		releaseFirst();
		expect(searchPort.terminate).not.toHaveBeenCalled();
		expect(definitionPort.terminate).not.toHaveBeenCalled();

		releaseSecond();
		await Promise.all(settled);
		expect(searchPort.terminate).toHaveBeenCalledOnce();
		expect(definitionPort.terminate).toHaveBeenCalledOnce();
	});

	it('keeps workers alive until the last of multiple Dictionary panes closes', async () => {
		const fixture = createFixture();
		const closeFirst = fixture.runtime.acquire();
		const closeSecond = fixture.runtime.acquire();
		await fixture.runtime.search('faith', source);
		closeFirst();
		expect(fixture.disposeSearch).not.toHaveBeenCalled();
		await fixture.runtime.search('hope', source);
		closeSecond();
		expect(fixture.createSearch).toHaveBeenCalledOnce();
		expect(fixture.disposeSearch).toHaveBeenCalledOnce();
	});
});
