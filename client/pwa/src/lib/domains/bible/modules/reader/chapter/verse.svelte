<!-- @component
Renders one Bible verse with paragraph/pericope presentation and Word children. It is a presentation/composition layer; chapter-level click/drag semantics are delegated from the parent chapter surface.
-->
<script lang="ts">
	// ================================ IMPORTS ================================
	// MODELS
	import type { Verse } from '../../../models/bible.model';
	import type {
		BibleParagraphMap
	} from '../../../models/bible-paragraphs.model';
	import type {
		BiblePericopeMap
	} from '../../../models/bible-pericopes.model';
	import type { BibleTextMarkup } from '../../../models/bible-text-markup.model';
	import Paragraph from './paragraph.svelte';
	import type {
		ChapterNotesByLocation
	} from './chapter-notes';
	import type { ChapterBookmarksByLocation } from '$lib/domains/bookmarks';
	import Pericope from './pericope.svelte';

	// Components
	import Word from './word.svelte';

	// =============================== BINDINGS ================================

	interface Props {
		/** Mutable chapter Text Markup draft rendered by descendant Word components. */
		textMarkup: BibleTextMarkup;
		/** Installed paragraph presentation keyed for the active chapter. */
		paragraphs: BibleParagraphMap;
		/** Installed pericope presentation keyed for the active chapter. */
		pericopes: BiblePericopeMap;
		/** Exact-location Note lookup used by descendant Word components. */
		notes: ChapterNotesByLocation;
		/** Exact-location Bookmark lookup for descendant Word components. */
		bookmarks: ChapterBookmarksByLocation;
		/** Active canonical Bible location used to derive Word/paragraph/pericope identity. */
		bibleLocationRef: string;
		/** Verse domain object rendered by this component. */
		verse: Verse;
	}

	let {
		textMarkup = $bindable<BibleTextMarkup>(),
		paragraphs = $bindable<BibleParagraphMap>(),
		pericopes = $bindable<BiblePericopeMap>(),
		notes = $bindable<ChapterNotesByLocation>(),
		bookmarks,
		bibleLocationRef,
		verse
	}: Props = $props();
</script>

{#if verse}
	<Paragraph
		bind:verseNumber={verse.number}
		bind:bibleLocationRef
		bind:paragraphs
	></Paragraph>

	<Pericope bind:verseNumber={verse.number} bind:bibleLocationRef bind:pericopes
	></Pericope>

	<!-- Group verse number and first word so the verse number is never at the 
	 	 end of a line -->
	<span class="inline-block">
		{#each verse.words.slice(0, 2) as word, idx}<Word
				bind:textMarkup
				bind:notes
				{bookmarks}
				{verse}
				{word}
				{bibleLocationRef}
				wordIdx={idx}
			></Word>
		{/each}
	</span>{#each verse.words.slice(2) as word, idx}
		<Word
			bind:textMarkup
			bind:notes
			{bookmarks}
			{verse}
			{word}
			{bibleLocationRef}
			wordIdx={idx + 2}
		></Word>
	{/each}
{/if}
