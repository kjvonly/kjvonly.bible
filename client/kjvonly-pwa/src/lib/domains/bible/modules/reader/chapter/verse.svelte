<script lang="ts">
	// ================================ IMPORTS ================================
	// MODELS
	import {
		type BibleMode,
		type Verse
	} from '../../../models/bible.model';
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
	import Pericope from './pericope.svelte';

	// Components
	import Word from './word.svelte';

	// =============================== BINDINGS ================================

	let {
		textMarkup = $bindable<BibleTextMarkup>(),
		paragraphs = $bindable<BibleParagraphMap>(),
		pericopes = $bindable<BiblePericopeMap>(),
		mode = $bindable<BibleMode>(),
		notes = $bindable<ChapterNotesByLocation>(),
		bibleLocationRef,
		bibleVersion,
		footnotes,
		lastKnownScrollPosition,
		verse
	}: {
		textMarkup: BibleTextMarkup;
		paragraphs: BibleParagraphMap;
		pericopes: BiblePericopeMap;
		mode: BibleMode;
		notes: ChapterNotesByLocation;
		bibleLocationRef: string;
		bibleVersion: string;
		footnotes: { [key: string]: string };
		lastKnownScrollPosition: number;
		verse: Verse;
	} = $props();
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
				bind:mode
				{verse}
				{word}
				{footnotes}
				{bibleLocationRef}
				{bibleVersion}
				{lastKnownScrollPosition}
				wordIdx={idx}
			></Word>
		{/each}
	</span>{#each verse.words.slice(2) as word, idx}
		<Word
			bind:textMarkup
			bind:notes
			bind:mode
			{verse}
			{word}
			{footnotes}
			{bibleLocationRef}
			{bibleVersion}
			{lastKnownScrollPosition}
			wordIdx={idx + 2}
		></Word>
	{/each}
{/if}
