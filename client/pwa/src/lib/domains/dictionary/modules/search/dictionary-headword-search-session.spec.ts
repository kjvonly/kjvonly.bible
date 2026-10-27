import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DictionaryEditionSource } from '../../models/dictionary.model';
import type { DictionaryService } from '../../services/dictionary.service';
import { DictionaryHeadwordSearchSession } from './dictionary-headword-search-session.svelte';

const webster1828: DictionaryEditionSource = {
	publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1828'
};
const webster1844: DictionaryEditionSource = {
	publisher: 'publisher', resourceId: 'kjvonly/dictionary/entries/webster-1844'
};

type SearchResult = Awaited<ReturnType<DictionaryService['search']>>;
const emptyResult: SearchResult = { matches: [] };

/** Complete a promise later to model out-of-order worker responses. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

/** Construct a search session with a controllable Dictionary service. */
function createSession(search: DictionaryService['search'] = async () => emptyResult) {
	return new DictionaryHeadwordSearchSession({ search });
}

afterEach(() => vi.useRealTimers());

describe('DictionaryHeadwordSearchSession', () => {
	it('shares the application debounce policy and searches only the latest prefix', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);

		session.update('a', webster1828);
		vi.advanceTimersByTime(200);
		session.update('ab', webster1828);
		vi.advanceTimersByTime(249);
		expect(search).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);

		expect(search).toHaveBeenCalledTimes(1);
		expect(search).toHaveBeenCalledWith('ab', webster1828);
		expect(session.searching).toBe(false);
	});

	it('keeps the existing results when another pane reports the same edition generation', async () => {
		vi.useFakeTimers();
		const match = { ...webster1828, headword: 'abandon', key: 'abandon' };
		const search = vi.fn(async () => ({ matches: [match] }));
		const session = createSession(search);

		session.update('ab', webster1828, 'generation-1');
		await vi.advanceTimersByTimeAsync(250);
		const originalMatches = session.matches;
		expect(session.searching).toBe(false);
		expect(originalMatches).toEqual([match]);

		// A second pane prepares the already-installed edition, producing a
		// different source object with the same Resource identity.
		session.update('ab', { ...webster1828 }, 'generation-1');
		expect(session.matches).toBe(originalMatches);
		expect(session.searching).toBe(false);
		await vi.advanceTimersByTimeAsync(500);
		expect(search).toHaveBeenCalledOnce();
	});

	it('does refresh an unchanged query when the accepted edition generation changes', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);

		session.update('ab', webster1828, 'generation-1');
		await vi.advanceTimersByTimeAsync(250);
		session.update('ab', { ...webster1828 }, 'generation-2');
		await vi.advanceTimersByTimeAsync(250);
		expect(search).toHaveBeenCalledTimes(2);
	});

	it('ignores replies from an older accepted generation of the same edition', async () => {
		vi.useFakeTimers();
		const previous = deferred<SearchResult>();
		const current = deferred<SearchResult>();
		const search = vi.fn()
			.mockReturnValueOnce(previous.promise)
			.mockReturnValueOnce(current.promise);
		const session = createSession(search);

		session.update('faith', webster1828, 'generation-1');
		await vi.advanceTimersByTimeAsync(250);
		session.update('faith', webster1828, 'generation-2');
		await vi.advanceTimersByTimeAsync(250);

		const freshMatch = { ...webster1828, headword: 'faith', key: 'faith' };
		current.resolve({ matches: [freshMatch] });
		await Promise.resolve();
		previous.resolve({ matches: [{ ...freshMatch, headword: 'old-faith', key: 'old-faith' }] });
		await Promise.resolve();

		expect(session.matches).toEqual([freshMatch]);
		expect(session.searching).toBe(false);
	});

	it('does not postpone an in-flight debounce for identical edition notifications', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);

		session.update('ab', webster1828, 'generation-1');
		await vi.advanceTimersByTimeAsync(200);
		session.update('ab', { ...webster1828 }, 'generation-1');
		await vi.advanceTimersByTimeAsync(50);
		expect(search).toHaveBeenCalledOnce();
	});

	it('restarts the pending search when the selected edition changes', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);

		session.update('faith', webster1828);
		vi.advanceTimersByTime(100);
		session.update('faith', webster1844);
		await vi.advanceTimersByTimeAsync(250);

		expect(search).toHaveBeenCalledTimes(1);
		expect(search).toHaveBeenCalledWith('faith', webster1844);
	});

	it('distinguishes publishers even when they use the same Resource ID', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);
		const otherPublisher = { ...webster1828, publisher: 'other-publisher' };

		session.update('faith', webster1828, 'generation-1');
		await vi.advanceTimersByTimeAsync(250);
		session.update('faith', otherPublisher, 'generation-1');
		await vi.advanceTimersByTimeAsync(250);

		expect(search).toHaveBeenCalledTimes(2);
		expect(search).toHaveBeenLastCalledWith('faith', otherPublisher);
	});

	it('cancels queued searches when the edition is unavailable and when the view closes', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);

		session.update('a', webster1828);
		session.update('a', undefined);
		await vi.advanceTimersByTimeAsync(300);
		expect(search).not.toHaveBeenCalled();
		expect(session.searching).toBe(false);

		session.update('b', webster1828);
		session.destroy();
		await vi.advanceTimersByTimeAsync(300);
		expect(search).not.toHaveBeenCalled();
	});

	it('snapshots a proxied edition identity before passing it to the service', async () => {
		vi.useFakeTimers();
		const search = vi.fn(async (_prefix: string, source: DictionaryEditionSource) => {
			expect(() => structuredClone(source)).not.toThrow();
			return emptyResult;
		});
		const session = createSession(search);
		const proxy = new Proxy(webster1828, {});

		session.update('a', proxy);
		await vi.advanceTimersByTimeAsync(250);
		expect(search).toHaveBeenCalledOnce();
	});

	it('ignores stale search success and errors when the prefix or selected edition changes', async () => {
		vi.useFakeTimers();
		const first = deferred<SearchResult>();
		const second = deferred<SearchResult>();
		const search = vi.fn()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const session = createSession(search);

		session.update('a', webster1828);
		await vi.advanceTimersByTimeAsync(250);
		session.update('z', webster1844);
		await vi.advanceTimersByTimeAsync(250);

		const newestMatch = {
			...webster1844, headword: 'zebra', key: 'zebra'
		};
		second.resolve({ matches: [newestMatch] });
		await Promise.resolve();
		expect(session.matches).toEqual([newestMatch]);
		expect(session.searching).toBe(false);

		first.reject(new Error('obsolete index failed'));
		await Promise.resolve();
		expect(session.matches).toEqual([newestMatch]);
		expect(session.searchError).toBeUndefined();
	});

	it('exposes index load failures through the normal search error path', async () => {
		vi.useFakeTimers();
		const search = vi.fn()
			.mockRejectedValueOnce(new Error('Index unavailable'))
			.mockRejectedValueOnce(new Error('Worker failed'));
		const session = createSession(search);

		session.update('a', webster1844);
		await vi.advanceTimersByTimeAsync(250);
		expect(session.searchError).toBe('Index unavailable');

		session.update('b', webster1844);
		await vi.advanceTimersByTimeAsync(250);
		expect(session.searchError).toBe('Worker failed');
		expect(session.searching).toBe(false);
	});

	it('retries an index error with the same prefix and edition', async () => {
		vi.useFakeTimers();
		const recoveredMatch = { ...webster1828, headword: 'abandon', key: 'abandon' };
		const search = vi.fn()
			.mockRejectedValueOnce(new Error('Temporary index failure'))
			.mockResolvedValueOnce({ matches: [recoveredMatch] });
		const session = createSession(search);

		session.update('ab', webster1828);
		await vi.advanceTimersByTimeAsync(250);
		expect(session.searchError).toBe('Temporary index failure');

		session.retry();
		expect(session.searchError).toBeUndefined();
		expect(session.searching).toBe(true);
		await Promise.resolve();
		expect(search).toHaveBeenCalledTimes(2);
		expect(search).toHaveBeenLastCalledWith('ab', webster1828);
		expect(session.matches).toEqual([recoveredMatch]);
		expect(session.searching).toBe(false);
	});

	it('recovers from a rejected search without re-entering the query', async () => {
		vi.useFakeTimers();
		const match = { ...webster1844, headword: 'faith', key: 'faith' };
		const search = vi.fn()
			.mockRejectedValueOnce(new Error('Worker failed'))
			.mockResolvedValueOnce({ matches: [match] });
		const session = createSession(search);

		session.update('faith', webster1844);
		await vi.advanceTimersByTimeAsync(250);
		expect(session.searchError).toBe('Worker failed');

		session.retry();
		expect(session.searchError).toBeUndefined();
		await Promise.resolve();
		expect(search).toHaveBeenCalledTimes(2);
		expect(search).toHaveBeenLastCalledWith('faith', webster1844);
		expect(session.matches).toEqual([match]);
	});

	it('ignores an older in-flight failure after an explicit retry', async () => {
		vi.useFakeTimers();
		const first = deferred<SearchResult>();
		const second = deferred<SearchResult>();
		const search = vi.fn()
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const session = createSession(search);

		session.update('faith', webster1844);
		await vi.advanceTimersByTimeAsync(250);
		session.retry();
		expect(search).toHaveBeenCalledTimes(2);
		first.reject(new Error('Obsolete worker error'));
		await Promise.resolve();
		expect(session.searchError).toBeUndefined();
		expect(session.searching).toBe(true);

		const match = { ...webster1844, headword: 'faith', key: 'faith' };
		second.resolve({ matches: [match] });
		await Promise.resolve();
		expect(session.matches).toEqual([match]);
		expect(session.searching).toBe(false);
	});

	it('does not retry when no source is selected or after destruction', async () => {
		const search = vi.fn(async () => emptyResult);
		const session = createSession(search);
		session.update('a', undefined);
		session.retry();
		expect(search).not.toHaveBeenCalled();

		session.update('ab', webster1828);
		session.destroy();
		session.retry();
		expect(search).not.toHaveBeenCalled();
	});

	it('ignores a response that completes after destruction', async () => {
		vi.useFakeTimers();
		const pending = deferred<SearchResult>();
		const session = createSession(() => pending.promise);

		session.update('a', webster1828);
		await vi.advanceTimersByTimeAsync(250);
		session.destroy();
		pending.resolve({
			matches: [{ ...webster1828, headword: 'abandon', key: 'abandon' }]
		});
		await Promise.resolve();
		expect(session.matches).toEqual([]);
	});
});
