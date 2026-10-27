<script lang="ts">
	import type {
		NormalizedWord
	} from '@kjvonly/normalized-content';
	import type {
		NormalizedContentLinkHandler
	} from '../models/normalized-content-link-handler';
	import type {
		NormalizedContentWordActivationHandler
	} from '../models/normalized-content-word-activation-handler';
	import {
		resolveNormalizedClasses
	} from '../presentation/normalized-class-resolver';
	import {
		shouldDelegateNormalizedLinkActivation
	} from '../presentation/normalized-link-activation';
	import type {
		NormalizedContentWordMarkerHandler
	} from '../models/normalized-content-word-marker-handler';
	import NoteStack from '$lib/components/svgs/noteStack.svelte';
	import Bookmark from '$lib/components/svgs/bookmark.svelte';
	import NormalizedMarkedText from './normalizedMarkedText.svelte';

	let {
		word,
		blockId,
		contentIndex,
		textMarkupClassName,
		onWordActivate,
		onLinkActivate,
		marked = false,
		bookmarked = false,
		onBookmarkMarkerActivate,
		onWordMarkerActivate,
		markersInteractive = true
	}: {
		word: NormalizedWord;
		blockId: string;
		contentIndex: number;
		textMarkupClassName?: string;
		onWordActivate?: NormalizedContentWordActivationHandler;
		onLinkActivate?: NormalizedContentLinkHandler;
		marked?: boolean;
		bookmarked?: boolean;
		onBookmarkMarkerActivate?: NormalizedContentWordMarkerHandler;
		onWordMarkerActivate?: NormalizedContentWordMarkerHandler;
		markersInteractive?: boolean;
	} = $props();

	const className = $derived(
		[
			resolveNormalizedClasses(
				word.class
			),
			textMarkupClassName
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const hrefs = $derived(
		word.href ?? []
	);

	const primaryHref = $derived(
		hrefs[0]
	);

	const hasPrimaryHref = $derived(
		primaryHref !== undefined
	);

	/**
	 * Delegates one ordinary word activation before linked-word navigation.
	 * Modified gestures remain native browser behavior.
	 */
	function onClick(
		event: MouseEvent
	): void {
		if (
			!shouldDelegateNormalizedLinkActivation(
				event
			)
		) {
			return;
		}

		if (
			onWordActivate?.({
				blockId,
				contentIndex
			})
		) {
			event.preventDefault();
			return;
		}

		if (
			!onLinkActivate ||
			hrefs.length === 0
		) {
			return;
		}

		if (
			onLinkActivate(
				hrefs
			)
		) {
			event.preventDefault();
		}
	}
</script>

{#if bookmarked && onBookmarkMarkerActivate}
	<button
		type="button"
		class="mr-1 inline-flex size-6 items-center justify-center align-middle text-support-a-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
		aria-label="Open word bookmarks"
		title="Open word bookmarks"
		disabled={!markersInteractive}
		data-normalized-word-bookmark=""
		data-normalized-bookmark-block={blockId}
		data-normalized-bookmark-index={contentIndex}
		onclick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onBookmarkMarkerActivate?.({ blockId, contentIndex });
		}}
	>
		<Bookmark classes="h-4 w-4 fill-current"></Bookmark>
	</button>
{/if}{#if marked && onWordMarkerActivate}
	<button
		type="button"
		class="mr-1 inline-flex size-6 items-center justify-center align-middle text-support-a-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default"
		aria-label="Open word notes"
		title="Open word notes"
		disabled={!markersInteractive}
		data-normalized-word-note=""
		data-normalized-note-block={blockId}
		data-normalized-note-index={contentIndex}
		onclick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			onWordMarkerActivate?.({ blockId, contentIndex });
		}}
	>
		<span class="inline-flex h-5 w-5 items-center justify-center">
			<NoteStack classes="h-4 w-4 fill-current"></NoteStack>
		</span>
	</button>
{/if}{#if hasPrimaryHref}
	<a
		class={['text-primary-500 underline underline-offset-2', className].filter(Boolean).join(' ')}
		href={primaryHref}
		data-normalized-content-index={contentIndex}
		data-normalized-content-kind="word"
		onclick={onClick}
	>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</a>
{:else}
	<span
		class={className}
		data-normalized-content-index={contentIndex}
		data-normalized-content-kind="word"
		onclick={onClick}
	>
		<NormalizedMarkedText {word}></NormalizedMarkedText>
	</span>
{/if}
