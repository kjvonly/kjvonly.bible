import Article from '$lib/components/svgs/article.svelte';
import Book2 from '$lib/components/svgs/book2.svelte';
import FileOpen from '$lib/components/svgs/fileOpen.svelte';
import Folder from '$lib/components/svgs/folder.svelte';
import Image from '$lib/components/svgs/image.svelte';
import MusicNote from '$lib/components/svgs/musicNote.svelte';
import Notes from '$lib/components/svgs/notes.svelte';
import Person from '$lib/components/svgs/person.svelte';
import Post from '$lib/components/svgs/post.svelte';

import type {
	FileManagerIconID
} from '../models/file-manager-icon.model';

///////////////////////////////////////////////////////////////////////////////

/**
 * Central FileManager item-icon registry.
 *
 * Publisher and folder icons describe filesystem hierarchy. Resource icon IDs
 * are resolved separately from optional `resourceMetadata.icon` with a
 * dataType-only fallback before they reach this presentation registry.
 */
const FILE_MANAGER_ICON_COMPONENTS = {
	publisher: Person,
	folder: Folder,
	article: Article,
	notes: Notes,
	post: Post,
	book: Book2,
	audio: MusicNote,
	video: FileOpen,
	image: Image,
	document: FileOpen,
	other: FileOpen
} as const satisfies Record<FileManagerIconID, unknown>;

///////////////////////////////////////////////////////////////////////////////

export function resolveFileManagerIconComponent(
	iconID: FileManagerIconID
) {
	return FILE_MANAGER_ICON_COMPONENTS[iconID];
}
