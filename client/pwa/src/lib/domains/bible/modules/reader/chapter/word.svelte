<!-- @component
Renders one Bible token, its Text Markup classes, and optional inline Note/Bookmark affordances. It exposes stable `data-bible-*` identity for chapter-level interactions and intentionally owns no reading/edit click behavior.
-->
<script lang="ts">
	import {
		useApplicationContext
	} from '$lib/application';
	// ================================ IMPORTS ================================
	// MODELS

	// SERVICES
	import type {
		BibleTextMarkup
	} from '../../../models/bible-text-markup.model';
	import type { Verse, Word } from '../../../models/bible.model';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import BookmarkIcon from '$lib/components/svgs/bookmark.svelte';
	import type {
		ChapterNotesByLocation
	} from './chapter-notes';
	import type { ChapterBookmarksByLocation } from '$lib/domains/bookmarks';
	const {
		bibleLocationReferenceService
	} = useApplicationContext();
	// =============================== BINDINGS ================================

	interface Props {
		/** Mutable chapter Text Markup draft used to derive this token’s classes. */
		textMarkup: BibleTextMarkup;
		/** Exact-location Note lookup used to decide whether to show the Note affordance. */
		notes: ChapterNotesByLocation;
		/** Exact-location Bookmark membership lookup for inline indicators. */
		bookmarks: ChapterBookmarksByLocation;
		/** Active canonical Bible location used to construct this token’s exact Note key. */
		bibleLocationRef: string;
		/** Parent verse containing this token. */
		verse: Verse;
		/** Bible token rendered by this component. */
		word: Word;
		/** Zero-based token index; index `0` is the verse-number token. */
		wordIdx: number;
	}

	let {
		textMarkup = $bindable<BibleTextMarkup>(),
		notes = $bindable<ChapterNotesByLocation>(),
		bookmarks,
		bibleLocationRef,
		verse,
		word,
		wordIdx
	}: Props = $props();

	// ================================= VARS ==================================

	let wordMarkup = $derived(
		textMarkup.markings?.[verse.number]?.[wordIdx]
	);
	let wordLocationRef = $derived(
		`${bibleLocationReferenceService
			.extractBookIDChapter(
				bibleLocationRef
			)}_${verse.number}_${wordIdx}`
	);
	let wordHasNotes = $derived(
		wordLocationRef in notes
	);
	let wordHasBookmarks = $derived(
		bookmarks[wordLocationRef] === true
	);
	let verseHasReferences = $derived(
		wordIdx === 0 &&
		verse.words.some((candidate) =>
			(candidate.href ?? []).some((href) =>
				href.includes('/')
			)
		)
	);
</script>

{#if wordHasNotes}
	<span class={wordMarkup?.class?.join(' ')}>
		&nbsp;<button
			type="button"
			data-bible-note
			data-verse={verse.number}
			data-word-index={wordIdx}
			aria-label="open note"
		>
			<NoteStack classes="fill-support-a-500"></NoteStack>
		</button>
	</span>
{/if}{#if wordHasBookmarks}
	<span class={wordMarkup?.class?.join(' ')}>
		&nbsp;<button
			type="button"
			data-bible-bookmark
			data-verse={verse.number}
			data-word-index={wordIdx}
			aria-label="open bookmarks"
		>
			<BookmarkIcon classes="fill-support-a-500"></BookmarkIcon>
		</button>
	</span>
{/if}<span
	data-bible-word
	data-verse={verse.number}
	data-word-index={wordIdx}
	class={wordMarkup?.class?.join(' ')}
>
	<span class={wordMarkup?.class?.join(' ')}>&nbsp;</span><span
		tabindex="-1"
		role="button"
		onkeydown={() => {}}
		class="{word.class?.join(' ')} {verseHasReferences
			? 'vno-refs'
			: ''} {wordMarkup?.class?.join(' ')}"
		>{word.text}</span
	></span
>

<style>
	@reference "../../../../../../app.css";
	.FOOTNO {
		cursor: pointer;
		vertical-align: baseline;
		position: relative;
		top: -0.6em;
		z-index: 0;
		height: 100%;
		@apply ps-1 pe-2 text-xs text-neutral-700 md:text-base;
	}

	.redtxt {
		@apply text-redtxt;
	}

	.vno {
		@apply cursor-pointer;
	}

	.vno-refs {
		@apply underline decoration-dotted;
	}

	.xref {
		/* @apply underline decoration-dotted !important; */
		@apply underline decoration-dotted;
		cursor: pointer;
	}

	span {
		display: inline-block;
	}
</style>
