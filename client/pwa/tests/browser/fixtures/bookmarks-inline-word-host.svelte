<script lang="ts">
	import { provideApplicationContext, type ApplicationContext } from '$lib/application';
	import { BibleLocationReferenceService } from '$lib/domains/bible';
	import type { Verse, Word } from '$lib/domains/bible/models/bible.model';
	import type { BibleTextMarkup } from '$lib/domains/bible/models/bible-text-markup.model';
	import WordView from '$lib/domains/bible/modules/reader/chapter/word.svelte';
	import type { ChapterNotesByLocation } from '$lib/domains/bible/modules/reader/chapter/chapter-notes';
	import { createChapterBookmarksByLocation, type Bookmark } from '$lib/domains/bookmarks';

	const bibleRefs = new BibleLocationReferenceService();
	provideApplicationContext({ bibleLocationReferenceService: bibleRefs } as ApplicationContext);

	const word: Word = { text: 'God', class: null, href: null, emphasis: false };
	const verse: Verse = { number: 16, words: [word, word, word], text: 'God' };
	let textMarkup: BibleTextMarkup = $state({ id: '', chapterRef: '', markings: {} });
	let notes: ChapterNotesByLocation = $state({});
	let bibleLocationRef = $state('43_3');
	let installed: Bookmark[] = $state([]);
	let bookmarks = $derived(createChapterBookmarksByLocation(
		installed, bibleRefs.extractBookIDChapter(bibleLocationRef), bibleRefs
	));

	function add(id: string, ref: string): void {
		installed = [...installed, {
			id, target: { kind: 'bible', bibleLocationRef: ref }, updatedAt: 1, previewText: 'God'
		}];
	}

	function move(id: string, ref: string): void {
		installed = installed.map((bookmark) => bookmark.id === id
			? { ...bookmark, target: { kind: 'bible', bibleLocationRef: ref } }
			: bookmark);
	}

	function remove(id: string): void {
		installed = installed.filter((bookmark) => bookmark.id !== id);
	}
</script>

<button type="button" data-test-add-bookmark onclick={() => add('first', '43_3_16_2')}>Mark word 2</button>
<button type="button" data-test-add-duplicate onclick={() => add('second', '43_3_16_2')}>Mark word 2 again</button>
<button type="button" data-test-delete-first onclick={() => remove('first')}>Delete first</button>
<button type="button" data-test-delete-second onclick={() => remove('second')}>Delete second</button>
<button type="button" data-test-move-to-verse onclick={() => move('first', '43_3_16_0')}>Move to verse number</button>
<button type="button" data-test-move-to-next-chapter onclick={() => move('first', '43_4_16_2')}>Move to next chapter</button>
<button type="button" data-test-view-next-chapter onclick={() => { bibleLocationRef = '43_4'; }}>View next chapter</button>

<WordView bind:textMarkup bind:notes {bookmarks} {bibleLocationRef} {verse} {word} wordIdx={0} />
<WordView bind:textMarkup bind:notes {bookmarks} {bibleLocationRef} {verse} {word} wordIdx={2} />
