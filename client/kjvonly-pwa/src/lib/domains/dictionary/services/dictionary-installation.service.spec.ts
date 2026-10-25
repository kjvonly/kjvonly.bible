import { describe, expect, it, vi } from 'vitest';
import type { ResourceInstallResult } from '$lib/resource';
import { createDictionaryEditionId, createDictionaryResourceId } from '../models/dictionary-identity';
import type { DictionaryEditionSource, DictionaryEditionManifest } from '../models/dictionary.model';

import { DICTIONARY_RESOURCE_TYPE } from '../resources/entries/dictionary-resource-contract';
import { DictionaryInstallationService } from './dictionary-installation.service';

const source1828 = { publisher: 'publisher-a', resourceId: createDictionaryResourceId('webster-1828') };
const source1844 = { publisher: 'publisher-b', resourceId: createDictionaryResourceId('webster-1844') };

/** A locally accepted edition, written by the generic Resource transaction. */
function manifest(source: DictionaryEditionSource): DictionaryEditionManifest {
	const edition = source.resourceId.split('/')[3]!;
	return {
		id: createDictionaryEditionId(source.publisher, edition),
		publisher: source.publisher,
		resourceId: source.resourceId,
		edition,
		modifiedAt: 100,
		entryCount: 2,
		definitionFormat: 'webster-html',
		storageFormat: 'chunks-v1',
		chunkGeneration: 'm100',
		chunkCount: 1
	};
}

/** Mimics the Resource worker's accepted Dictionary Resource result. */
function handled(source: DictionaryEditionSource): ResourceInstallResult {
	return {
		requested: source,
		found: true,
		resources: [{ reference: source, resourceType: DICTIONARY_RESOURCE_TYPE, status: 'handled' }]
	};
}

describe('DictionaryInstallationService', () => {
	it('uses an accepted local edition without contacting the Resource worker', async () => {
		const installed = manifest(source1828);
		const getEdition = vi.fn().mockResolvedValue(installed);
		const install = vi.fn();
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		expect(await service.ensureInstalled(source1828)).toEqual(installed);
		expect(install).not.toHaveBeenCalled();
	});

	it('lists accepted editions after archive import without contacting the Resource worker', async () => {
		const installed = manifest(source1828);
		const listEditions = vi.fn().mockResolvedValue([installed]);
		const install = vi.fn();
		const service = new DictionaryInstallationService({ getEdition: vi.fn(), listEditions }, { install }, { prepare: async () => undefined });

		await expect(service.listInstalledEditions()).resolves.toEqual([installed]);
		expect(listEditions).toHaveBeenCalledOnce();
		expect(install).not.toHaveBeenCalled();
	});

	it('installs a missing edition using its exact publisher and Resource ID', async () => {
		const installed = manifest(source1828);
		const getEdition = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(installed);
		const install = vi.fn().mockResolvedValue(handled(source1828));
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		expect(await service.ensureInstalled(source1828)).toEqual(installed);
		expect(install).toHaveBeenCalledTimes(1);
		expect(install).toHaveBeenCalledWith(source1828);
		expect(getEdition).toHaveBeenCalledTimes(2);
	});

	it('shares concurrent work between panes without retaining resolved promises', async () => {
		let complete!: (result: ResourceInstallResult) => void;
		const pending = new Promise<ResourceInstallResult>(resolve => { complete = resolve; });
		const getEdition = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValue(manifest(source1828));
		const install = vi.fn().mockReturnValue(pending);
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		const a = service.ensureInstalled(source1828);
		const b = service.ensureInstalled({ ...source1828 });
		expect(a).toBe(b);
		complete(handled(source1828));
		await expect(a).resolves.toEqual(manifest(source1828));
		expect(install).toHaveBeenCalledTimes(1);
		expect(await service.ensureInstalled(source1828)).toEqual(manifest(source1828));
		expect(install).toHaveBeenCalledTimes(1);
	});

	it('serializes missing-edition Resource installations without serializing local reads', async () => {
		let complete1828!: (result: ResourceInstallResult) => void;
		const pending1828 = new Promise<ResourceInstallResult>(resolve => { complete1828 = resolve; });
		const installed = new Set<string>();
		const getEdition = vi.fn(async (source: DictionaryEditionSource) =>
			installed.has(source.resourceId) ? manifest(source) : undefined
		);
		const install = vi.fn((source: DictionaryEditionSource) => {
			if (source.resourceId === source1828.resourceId) {
				return pending1828.then(result => {
					installed.add(source.resourceId);
					return result;
				});
			}
			installed.add(source.resourceId);
			return Promise.resolve(handled(source));
		});
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		const first = service.ensureInstalled(source1828);
		const second = service.ensureInstalled(source1844);

		await vi.waitFor(() => expect(install).toHaveBeenCalledTimes(1));
		expect(install).toHaveBeenCalledWith(source1828);
		expect(getEdition).toHaveBeenCalledWith(source1844);

		complete1828(handled(source1828));
		await expect(first).resolves.toEqual(manifest(source1828));
		await expect(second).resolves.toEqual(manifest(source1844));
		expect(install.mock.calls.map(([source]) => source.resourceId)).toEqual([
			source1828.resourceId,
			source1844.resourceId
		]);
	});

	it('continues to the next edition after a failed Resource installation', async () => {
		let fail1828!: (error: Error) => void;
		const pending1828 = new Promise<ResourceInstallResult>((_resolve, reject) => { fail1828 = reject; });
		const getEdition = vi.fn(async (source: DictionaryEditionSource) =>
			source.resourceId === source1844.resourceId ? manifest(source1844) : undefined
		);
		const install = vi.fn((source: DictionaryEditionSource) =>
			source.resourceId === source1828.resourceId
				? pending1828
				: Promise.resolve(handled(source))
		);
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		const first = service.prepareSource(source1828);
		const second = service.prepareSource(source1844);
		await vi.waitFor(() => expect(install).toHaveBeenCalledTimes(1));
		// A previously installed edition remains accessible while another downloads.
		await expect(second).resolves.toMatchObject({ status: 'ready', edition: manifest(source1844) });
		fail1828(new Error('offline'));
		await expect(first).resolves.toMatchObject({ status: 'error', error: 'offline' });
		// Queue must remain usable after failure, even for a fresh attempt.
		await expect(service.prepareSource(source1844)).resolves.toMatchObject({ status: 'ready' });
		expect(install).toHaveBeenCalledTimes(1);
	});

	it('does not block a queued edition after an earlier download fails', async () => {
		let failFirst!: (error: Error) => void;
		const pendingFirst = new Promise<ResourceInstallResult>((_resolve, reject) => { failFirst = reject; });
		const ready = new Set<string>();
		const getEdition = vi.fn(async (source: DictionaryEditionSource) =>
			ready.has(source.resourceId) ? manifest(source) : undefined
		);
		const install = vi.fn((source: DictionaryEditionSource) => {
			if (source.resourceId === source1828.resourceId) return pendingFirst;
			ready.add(source.resourceId);
			return Promise.resolve(handled(source));
		});
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		const first = service.prepareSource(source1828);
		const second = service.prepareSource(source1844);
		await vi.waitFor(() => expect(install).toHaveBeenCalledTimes(1));
		failFirst(new Error('download failed'));
		await expect(first).resolves.toMatchObject({ status: 'error', error: 'download failed' });
		await expect(second).resolves.toMatchObject({ status: 'ready', edition: manifest(source1844) });
		expect(install).toHaveBeenCalledTimes(2);
	});

	it('reports independent preparation results when one edition is installed and another is unavailable', async () => {
		const getEdition = vi.fn(async (source: DictionaryEditionSource) =>
			source.resourceId === source1828.resourceId ? manifest(source1828) : undefined
		);
		const install = vi.fn().mockResolvedValue({ requested: source1844, found: false, resources: [] });
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		const [ready, failed] = await Promise.all([
			service.prepareSource(source1828),
			service.prepareSource(source1844)
		]);
		expect(ready).toEqual({ source: source1828, status: 'ready', edition: manifest(source1828) });
		expect(failed).toMatchObject({ source: source1844, status: 'error', error: expect.stringContaining('not found') });
		expect(install).toHaveBeenCalledTimes(1);
		expect(install).toHaveBeenCalledWith(source1844);
	});

	it('retries after an installation failure without deleting or overwriting local state itself', async () => {
		const installed = manifest(source1828);
		const getEdition = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockResolvedValueOnce(installed);
		const install = vi.fn()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce(handled(source1828));
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		await expect(service.ensureInstalled(source1828)).rejects.toThrow('offline');
		await expect(service.ensureInstalled(source1828)).resolves.toEqual(installed);
		expect(install).toHaveBeenCalledTimes(2);
	});

	it('requires the requested Dictionary Resource outcome, not just found=true', async () => {
		const getEdition = vi.fn().mockResolvedValue(undefined);
		const install = vi.fn().mockResolvedValue({
			requested: source1828,
			found: true,
			resources: [{ reference: source1828, resourceType: 'bible/chapters', status: 'handled' }]
		});
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		await expect(service.ensureInstalled(source1828)).rejects.toThrow('not accepted');
	});

	it('does not claim success when the edition manifest is still missing', async () => {
		const getEdition = vi.fn().mockResolvedValue(undefined);
		const install = vi.fn().mockResolvedValue(handled(source1828));
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		await expect(service.ensureInstalled(source1828)).rejects.toThrow('was not installed');
	});

	it('rejects an invalid Resource ID before reading the local store or installing', async () => {
		const getEdition = vi.fn();
		const install = vi.fn();
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare: async () => undefined });
		expect(() => service.ensureInstalled({ publisher: 'a', resourceId: 'invalid' })).toThrow('Invalid Dictionary');
		expect(getEdition).not.toHaveBeenCalled();
		expect(install).not.toHaveBeenCalled();
	});
	it('requires the published index before installing entries', async () => {
		const order: string[] = [];
		const installed = manifest(source1828);
		const getEdition = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(installed);
		const prepare = vi.fn().mockImplementation(async () => {
			order.push('index');
			throw new Error('published index unavailable');
		});
		const install = vi.fn().mockImplementation(async () => {
			order.push('entries');
			return handled(source1828);
		});
		const service = new DictionaryInstallationService({ getEdition, listEditions: async () => [] }, { install }, { prepare });
		await expect(service.ensureInstalled(source1828)).rejects.toThrow('published index unavailable');
		expect(order).toEqual(['index']);
		expect(install).not.toHaveBeenCalled();
	});

});
