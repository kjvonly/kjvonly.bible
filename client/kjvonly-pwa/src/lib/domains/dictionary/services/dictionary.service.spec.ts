import { describe, expect, it, vi } from 'vitest';
import { createDictionaryService } from './dictionary.service';

const source = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828' };

/** Control completion order independently of when a Dictionary operation starts. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(complete => { resolve = complete; });
	return { promise, resolve };
}

describe('DictionaryService', () => {
	it('installs Application-configured editions on Dictionary entry, not at application composition', async () => {
		const other = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1844' };
		const acquire = vi.fn(() => vi.fn());
		const prepareSource = vi.fn(async (requested: typeof source) => ({
			source: requested,
			status: 'ready' as const,
			edition: { entryCount: 80, modifiedAt: 1, chunkGeneration: 'g1' }
		}));
		const service = createDictionaryService(
			{ acquire, search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions: async () => [] },
			[source, other]
		);

		expect(prepareSource).not.toHaveBeenCalled();
		const statuses: string[] = [];
		service.subscribeToEditionStatus(status => statuses.push(status.status));
		const leave = service.enter();
		await vi.waitFor(() => expect(statuses).toEqual(['ready', 'ready']));
		expect(prepareSource.mock.calls.map(([requested]) => requested)).toEqual([source, other]);
		leave();

		// Both are accepted: opening another pane must not download either again.
		const leaveAgain = service.enter();
		expect(prepareSource).toHaveBeenCalledTimes(2);
		leaveAgain();
	});

	it('retries only a failed on-enter edition without blocking the other', async () => {
		const other = { publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1844' };
		let fails = true;
		const prepareSource = vi.fn(async (requested: typeof source) =>
			requested.resourceId === other.resourceId && fails
				? { source: requested, status: 'error' as const, error: 'Offline' }
				: { source: requested, status: 'ready' as const,
					edition: { entryCount: 80, modifiedAt: 1, chunkGeneration: 'g1' } }
		);
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions: async () => [] },
			[source, other]
		);
		const statuses: string[] = [];
		service.subscribeToEditionStatus(result => statuses.push(`${result.source.resourceId}:${result.status}`));
		service.enter()();
		await vi.waitFor(() => expect(statuses).toHaveLength(2));
		fails = false;
		service.enter()();
		await vi.waitFor(() => expect(statuses).toHaveLength(3));
		expect(prepareSource.mock.calls.map(([requested]) => requested)).toEqual([source, other, other]);
		expect(statuses.at(-1)).toBe(`${other.resourceId}:ready`);
	});
	it('delegates view lifetime, search, and definitions to the shared runtime', async () => {
		const release = vi.fn();
		const acquire = vi.fn(() => release);
		const search = vi.fn().mockResolvedValue({ matches: [] });
		const getNormalized = vi.fn().mockResolvedValue({ blocks: [] });
		const prepared = { source, status: 'ready' as const, edition: { entryCount: 80 } };
		const prepareSource = vi.fn().mockResolvedValue(prepared);
		const service = createDictionaryService({ acquire, search, getNormalized }, { prepareSource, listInstalledEditions: async () => [] });

		expect(prepareSource).not.toHaveBeenCalled();
		const leave = service.enter();
		await expect(service.prepareSource(source)).resolves.toEqual(prepared);
		await expect(service.search('ab', source)).resolves.toEqual({ matches: [] });
		await expect(service.getNormalized(source, 'abandon')).resolves.toEqual({ blocks: [] });
		expect(prepareSource).toHaveBeenCalledOnce();
		expect(prepareSource).toHaveBeenCalledWith(source);
		expect(acquire).toHaveBeenCalledOnce();
		expect(search).toHaveBeenCalledWith('ab', source);
		expect(getNormalized).toHaveBeenCalledWith(source, 'abandon');
		leave();
		expect(release).toHaveBeenCalledOnce();
	});

	it('delegates installed edition discovery to Dictionary persistence without involving the worker', async () => {
		const listInstalledEditions = vi.fn().mockResolvedValue([{ ...source, edition: 'webster-1828' }]);
		const acquire = vi.fn();
		const service = createDictionaryService(
			{ acquire, search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn(), listInstalledEditions }
		);
		await expect(service.listInstalledEditions()).resolves.toHaveLength(1);
		expect(listInstalledEditions).toHaveBeenCalledOnce();
		expect(acquire).not.toHaveBeenCalled();
	});

	it('passes through per-edition installation errors without affecting worker lifetime', async () => {
		const acquire = vi.fn(() => vi.fn());
		const prepareSource = vi.fn().mockResolvedValue({ source, status: 'error', error: 'Not available' });
		const service = createDictionaryService(
			{ acquire, search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions: async () => [] }
		);

		await expect(service.prepareSource(source)).resolves.toMatchObject({
			source, status: 'error', error: 'Not available'
		});
		expect(acquire).not.toHaveBeenCalled();
	});
	it('reports unexpected preparation failures through the same edition-status notifications', async () => {
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn().mockRejectedValue(new Error('Unexpected storage failure')), listInstalledEditions: async () => [] }
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);
		const failure = { source, status: 'error' as const, error: 'Unexpected storage failure' };
		await expect(service.prepareSource(source)).resolves.toEqual(failure);
		expect(listener).toHaveBeenCalledExactlyOnceWith(failure);
	});

	it('notifies open panes when a different pane retries an edition', async () => {
		const initialFailure = { source, status: 'error' as const, error: 'Offline' };
		const recovered = { source, status: 'ready' as const, edition: { entryCount: 80 } };
		const prepareSource = vi.fn().mockResolvedValue(recovered)
			.mockResolvedValueOnce(initialFailure);
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions: async () => [] }
		);
		const firstPane = vi.fn();
		const secondPane = vi.fn();
		const unsubscribeFirst = service.subscribeToEditionStatus(firstPane);
		const unsubscribeSecond = service.subscribeToEditionStatus(secondPane);

		await expect(service.prepareSource(source)).resolves.toBe(initialFailure);
		await expect(service.prepareSource(source)).resolves.toBe(recovered);
		expect(firstPane.mock.calls.map(([status]) => status)).toEqual([initialFailure, recovered]);
		expect(secondPane.mock.calls.map(([status]) => status)).toEqual([initialFailure, recovered]);

		unsubscribeFirst();
		unsubscribeFirst();
		await service.prepareSource(source);
		expect(firstPane).toHaveBeenCalledTimes(2);
		expect(secondPane).toHaveBeenCalledTimes(3);
		unsubscribeSecond();
	});

	it('isolates subscriber errors from preparation and other views', async () => {
		const prepared = { source, status: 'ready' as const, edition: { entryCount: 80 } };
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn().mockResolvedValue(prepared), listInstalledEditions: async () => [] }
		);
		const logging = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			service.subscribeToEditionStatus(() => { throw new Error('Unmounted view'); });
			const activePane = vi.fn();
			service.subscribeToEditionStatus(activePane);
			await expect(service.prepareSource(source)).resolves.toBe(prepared);
			expect(activePane).toHaveBeenCalledWith(prepared);
			expect(logging).toHaveBeenCalledOnce();
		} finally {
			logging.mockRestore();
		}
	});

	it('notifies panes only when a listed accepted edition changes generation', async () => {
		const original = { ...source, entryCount: 80, modifiedAt: 1, chunkGeneration: 'm1' };
		const next = { ...source, entryCount: 81, modifiedAt: 2, chunkGeneration: 'm2' };
		const listInstalledEditions = vi.fn().mockResolvedValue([original]);
		const prepareSource = vi.fn().mockResolvedValue({ source, status: 'ready', edition: original });
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions }
		);
		const firstPane = vi.fn();
		const secondPane = vi.fn();
		service.subscribeToEditionStatus(firstPane);
		service.subscribeToEditionStatus(secondPane);

		await service.prepareSource(source);
		firstPane.mockClear();
		secondPane.mockClear();
		await service.refreshImportedEditions();
		expect(firstPane).not.toHaveBeenCalled();
		expect(secondPane).not.toHaveBeenCalled();

		listInstalledEditions.mockResolvedValue([next]);
		await service.refreshImportedEditions();
		expect(firstPane).toHaveBeenCalledExactlyOnceWith({ source, status: 'ready', edition: next });
		expect(secondPane).toHaveBeenCalledExactlyOnceWith({ source, status: 'ready', edition: next });
		await service.refreshImportedEditions();
		expect(firstPane).toHaveBeenCalledTimes(1);
		expect(listInstalledEditions).toHaveBeenCalledTimes(3);
		expect(prepareSource).toHaveBeenCalledTimes(1);
	});

	it('keeps a newer imported revision when an older preparation completes later', async () => {
		const oldEdition = { ...source, entryCount: 80, modifiedAt: 1, chunkGeneration: 'm1' };
		const newEdition = { ...source, entryCount: 81, modifiedAt: 2, chunkGeneration: 'm2' };
		const pending = deferred<{ source: typeof source; status: 'ready'; edition: typeof oldEdition }>();
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn(() => pending.promise), listInstalledEditions: vi.fn().mockResolvedValue([newEdition]) }
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);

		const preparing = service.prepareSource(source);
		await service.refreshImportedEditions();
		pending.resolve({ source, status: 'ready', edition: oldEdition });
		await preparing;
		expect(listener).toHaveBeenCalledExactlyOnceWith({ source, status: 'ready', edition: newEdition });
	});

	it('ignores an older manifest listing that finishes after a newer archive refresh', async () => {
		const oldEdition = { ...source, entryCount: 80, modifiedAt: 1, chunkGeneration: 'm1' };
		const newEdition = { ...source, entryCount: 81, modifiedAt: 2, chunkGeneration: 'm2' };
		const oldRead = deferred<(typeof oldEdition)[]>();
		const newRead = deferred<(typeof newEdition)[]>();
		const listInstalledEditions = vi.fn()
			.mockReturnValueOnce(oldRead.promise)
			.mockReturnValueOnce(newRead.promise);
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn(), listInstalledEditions }
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);

		const firstRefresh = service.refreshImportedEditions();
		const secondRefresh = service.refreshImportedEditions();
		newRead.resolve([newEdition]);
		await secondRefresh;
		oldRead.resolve([oldEdition]);
		await firstRefresh;
		expect(listener).toHaveBeenCalledExactlyOnceWith({ source, status: 'ready', edition: newEdition });
	});

	it('does not replace an accepted imported edition with a late preparation error', async () => {
		const edition = { ...source, entryCount: 81, modifiedAt: 2, chunkGeneration: 'm2' };
		const pending = deferred<{ source: typeof source; status: 'error'; error: string }>();
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource: vi.fn(() => pending.promise), listInstalledEditions: vi.fn().mockResolvedValue([edition]) }
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);
		const preparing = service.prepareSource(source);
		await service.refreshImportedEditions();
		pending.resolve({ source, status: 'error', error: 'Outdated installation failure' });
		await preparing;
		expect(listener).toHaveBeenCalledExactlyOnceWith({ source, status: 'ready', edition });
	});

	it('publishes accepted editions independently without downloading missing editions', async () => {
		const otherSource = { publisher: 'other-publisher', resourceId: source.resourceId };
		const edition = { ...source, entryCount: 80, modifiedAt: 1, chunkGeneration: 'm1' };
		const otherEdition = { ...otherSource, entryCount: 90, modifiedAt: 3, chunkGeneration: 'm3' };
		const listInstalledEditions = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([edition, otherEdition]);
		const prepareSource = vi.fn();
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{ prepareSource, listInstalledEditions }
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);
		await service.refreshImportedEditions();
		expect(listener).not.toHaveBeenCalled();
		await service.refreshImportedEditions();
		expect(listener.mock.calls.map(([status]) => status)).toEqual([
			{ source, status: 'ready', edition },
			{ source: otherSource, status: 'ready', edition: otherEdition }
		]);
		expect(prepareSource).not.toHaveBeenCalled();
	});

	it('can publish a ready edition after an earlier preparation error', async () => {
		const edition = { ...source, entryCount: 80, modifiedAt: 3, chunkGeneration: 'm3' };
		const service = createDictionaryService(
			{ acquire: vi.fn(() => vi.fn()), search: vi.fn(), getNormalized: vi.fn() },
			{
				prepareSource: vi.fn().mockResolvedValue({ source, status: 'error', error: 'Offline' }),
				listInstalledEditions: vi.fn().mockResolvedValue([edition])
			}
		);
		const listener = vi.fn();
		service.subscribeToEditionStatus(listener);
		await service.prepareSource(source);
		await service.refreshImportedEditions();
		expect(listener.mock.calls.map(([status]) => status.status)).toEqual(['error', 'ready']);
	});

});
