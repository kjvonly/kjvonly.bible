import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createNormalizedReaderLoadProfile,
	isNormalizedReaderProfilingEnabled,
	logNormalizedReaderServiceDuration
} from './normalized-content-reader-performance';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('Normalized Reader opt-in performance tracing', () => {
	it('keeps profiling disabled when browser storage is unavailable', () => {
		vi.stubGlobal('window', undefined);
		expect(isNormalizedReaderProfilingEnabled()).toBe(false);
		expect(createNormalizedReaderLoadProfile()).toBeUndefined();
	});

	it('ignores restricted storage without affecting document loading', () => {
		vi.stubGlobal('window', {
			localStorage: { getItem: () => { throw new Error('blocked'); } }
		});
		expect(createNormalizedReaderLoadProfile()).toBeUndefined();
	});

	it('reports milestone and nested timings only after explicit opt-in', () => {
		const table = vi.spyOn(console, 'table').mockImplementation(() => undefined);
		const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
		const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
		vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
		vi.stubGlobal('window', {
			localStorage: { getItem: (key: string) => key === 'kjvonly:reader-perf' ? '1' : null }
		});

		const profile = createNormalizedReaderLoadProfile();
		expect(profile).toBeDefined();
		profile!.mark('Filesystem lookup');
		profile!.duration('Marker projection', 12);
		profile!.finish();
		logNormalizedReaderServiceDuration('IndexedDB read', performance.now());

		expect(table).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({ stage: 'Filesystem lookup' }),
			expect.objectContaining({ stage: 'Marker projection', durationMs: 12 })
		]));
		expect(group).toHaveBeenCalledOnce();
		expect(info).toHaveBeenCalledOnce();
	});
});
