import { Modules, type NavigationViewState, type ResourceModuleOpenContext } from '$lib/application';
import type { ResourceDescriptor } from '$lib/resource';
import type { FilesystemEntry } from '$lib/domains/filesystem';
import type { NormalizedDocumentBookmarkTarget } from '../../models/bookmark.model';

/** Ports needed to open a Resource without importing File Manager or Reader UI. */
interface NormalizedBookmarkOpenPorts {
    readonly filesystemService: {
        findResourceEntry(publisher: string, resourceId: string): Promise<FilesystemEntry | undefined>;
    };
    readonly resourceModuleResolver: {
        resolve(descriptor: ResourceDescriptor, context?: ResourceModuleOpenContext): {
            readonly module: Modules;
            readonly view: string | number;
            readonly state: NavigationViewState;
        };
    };
    readonly navigation: {
        pushModule(module: Modules, view: string | number, state: NavigationViewState): unknown;
    };
}

/**
 * Open a normalized Bookmark from the standalone Bookmarks list.
 *
 * Bookmark identity is not a Resource descriptor; the Filesystem resolves an
 * accepted mounted mapping and the application chooses its registered Module.
 * The canonical target is passed as a Reader launch intent, not a filesystem
 * path or a synthetic descriptor. Returns false if the Resource is unavailable.
 */
export async function openNormalizedBookmarkFromMain(
    target: NormalizedDocumentBookmarkTarget,
    { filesystemService, resourceModuleResolver, navigation }: NormalizedBookmarkOpenPorts
): Promise<boolean> {
    const { publisher, resourceId } = target.document;
    const entry = await filesystemService.findResourceEntry(publisher, resourceId);
    if (!entry) return false;

    // File Manager uses the mounted path's basename for its Reader title.
    // Keep that presentation context when opening the same Resource from Bookmarks.
    const fileName = entry.path.split('/').pop();
    const destination = resourceModuleResolver.resolve(
        entry.descriptor,
        fileName ? { fileName } : undefined
    );
    if (destination.module !== Modules.NORMALIZED_CONTENT) {
        throw new Error('The bookmarked Resource has no Normalized Content Reader');
    }
    navigation.pushModule(destination.module, destination.view, {
        ...destination.state,
        bookmarkTarget: {
            kind: target.kind,
            document: { ...target.document },
            address: { ...target.address }
        }
    });
    return true;
}
