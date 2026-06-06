<script lang="ts">
	// ================================ IMPORTS ================================
	// MODELS
	import {
		type Annotations,
		type Paragraphs,
		type BibleMode,
		type Verse,
		type Pericopes
	} from '$lib/models/bible.model';
	import type { Pane } from '$lib/models/pane.model';
	import Paragraph from './paragraph.svelte';
	import Pericope from './pericope.svelte';

	// Components
	import Word from './word.svelte';

	// =============================== BINDINGS ================================

	let {
		annotations = $bindable<Annotations>(),
		paragraphs = $bindable<Paragraphs>(),
		pericopes = $bindable<Pericopes>(),
		pane = $bindable<Pane>(),
		mode = $bindable<BibleMode>(),
		notes = $bindable<any>(),
		bibleLocationRef,
		bibleVersion,
		footnotes,
		lastKnownScrollPosition,
		verse
	}: {
		annotations: Annotations;
		paragraphs: Paragraphs;
		pericopes: Pericopes;
		pane: Pane;
		mode: BibleMode;
		notes: any;
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
				bind:pane
				bind:annotations
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
			bind:pane
			bind:annotations
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
