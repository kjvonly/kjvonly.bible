import {
	describe,
	expect,
	it
} from 'vitest';

import Article from '$lib/components/svgs/article.svelte';
import Book2 from '$lib/components/svgs/book2.svelte';
import FileOpen from '$lib/components/svgs/fileOpen.svelte';
import Folder from '$lib/components/svgs/folder.svelte';
import Image from '$lib/components/svgs/image.svelte';
import MusicNote from '$lib/components/svgs/musicNote.svelte';
import Notes from '$lib/components/svgs/notes.svelte';
import Person from '$lib/components/svgs/person.svelte';
import Post from '$lib/components/svgs/post.svelte';

import {
	resolveFileManagerIconComponent
} from './file-manager-icon-component-resolver';

describe(
	'resolveFileManagerIconComponent',
	() => {
		it(
			'resolves hierarchy and Resource icons from the central registry',
			() => {
				expect(resolveFileManagerIconComponent('publisher')).toBe(Person);
				expect(resolveFileManagerIconComponent('folder')).toBe(Folder);
				expect(resolveFileManagerIconComponent('article')).toBe(Article);
				expect(resolveFileManagerIconComponent('notes')).toBe(Notes);
				expect(resolveFileManagerIconComponent('post')).toBe(Post);
				expect(resolveFileManagerIconComponent('book')).toBe(Book2);
				expect(resolveFileManagerIconComponent('audio')).toBe(MusicNote);
				expect(resolveFileManagerIconComponent('image')).toBe(Image);
				expect(resolveFileManagerIconComponent('document')).toBe(FileOpen);
				expect(resolveFileManagerIconComponent('video')).toBe(FileOpen);
				expect(resolveFileManagerIconComponent('other')).toBe(FileOpen);
			}
		);
	}
);
