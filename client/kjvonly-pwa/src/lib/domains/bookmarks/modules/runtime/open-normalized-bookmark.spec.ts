import { describe, expect, it, vi } from 'vitest';
import { Modules, ResourceModuleResolver } from '$lib/application';
import { normalizedContentResourceModuleRegistrations } from '$lib/domains/normalized-content';
import type { ResourceDescriptor } from '$lib/resource';
import type { FilesystemEntry } from '$lib/domains/filesystem';
import type { NormalizedDocumentBookmarkTarget } from '../../models/bookmark.model';
import { openNormalizedBookmarkFromMain } from './open-normalized-bookmark';

const target: NormalizedDocumentBookmarkTarget = {
    kind: 'normalized-document',
    document: { publisher: 'publisher', resourceId: 'a/%2F/b' },
    address: { kind: 'word', blockId: '__proto__', contentIndex: 7 }
};
const descriptor = {
    metadata: {
        publisher: 'publisher', resourceId: 'a/%2F/b',
        resourceType: 'normalized-content/document', dataType: 'kjvonly.normalized-document',
        dataVersion: 1, modifiedAt: 42, representation: 'content', mediaType: 'application/json'
    },
    strategy: { type: 'fixture', data: null }
} as ResourceDescriptor;

const entry: FilesystemEntry = {
    path: 'library/commentary/Matthew-Henry/Genesis-1.nd.json',
    descriptor
};

describe('Main Bookmarks → Normalized Content Reader', () => {
    it('resolves the Resource through the application and opens its canonical word', async () => {
        const findResourceEntry = vi.fn().mockResolvedValue(entry);
        const resolver = new ResourceModuleResolver(normalizedContentResourceModuleRegistrations);
        const resolve = vi.spyOn(resolver, 'resolve');
        const pushModule = vi.fn();
        expect(await openNormalizedBookmarkFromMain(target, {
            filesystemService: { findResourceEntry },
            resourceModuleResolver: resolver,
            navigation: { pushModule }
        })).toBe(true);
        expect(findResourceEntry).toHaveBeenCalledWith('publisher', 'a/%2F/b');
        expect(resolve).toHaveBeenCalledWith(descriptor, { fileName: 'Genesis-1.nd.json' });
        expect(pushModule).toHaveBeenCalledWith(Modules.NORMALIZED_CONTENT, 'normalized-content.reader', {
            descriptor, fileName: 'Genesis-1.nd.json', bookmarkTarget: target
        });
    });

    it('does not navigate when the bookmarked Resource is not mounted', async () => {
        const resolve = vi.fn();
        const pushModule = vi.fn();
        expect(await openNormalizedBookmarkFromMain(target, {
            filesystemService: { findResourceEntry: vi.fn().mockResolvedValue(undefined) },
            resourceModuleResolver: { resolve },
            navigation: { pushModule }
        })).toBe(false);
        expect(resolve).not.toHaveBeenCalled();
        expect(pushModule).not.toHaveBeenCalled();
    });

    it('rejects a Resource that resolves to a different module', async () => {
        const pushModule = vi.fn();
        await expect(openNormalizedBookmarkFromMain(target, {
            filesystemService: { findResourceEntry: vi.fn().mockResolvedValue(entry) },
            resourceModuleResolver: { resolve: vi.fn().mockReturnValue({
                module: Modules.BIBLE, view: 'bible.reader', state: {}
            }) },
            navigation: { pushModule }
        })).rejects.toThrow('no Normalized Content Reader');
        expect(pushModule).not.toHaveBeenCalled();
    });
});
