<script lang="ts">
	// ================================ IMPORTS ================================
	// APPLICATION
	import {
		Modules,
		PaneSplit,
		useApplicationContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	// COMPONENTS
	import KJVIconButton from '$lib/components/buttons/KJVIconButton.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';
	import Dictionary from '$lib/components/svgs/dictionary.svelte';
	import Link from '$lib/components/svgs/link.svelte';

	// MODELS
	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';
	import {
		REFS_VIEWS
	} from '../../models/refs-navigation.model';
	import type {
		SearchResult
	} from '../../models/search.model';

	// SERVICES
	const {
		toastService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	let {
		searchResult
	}: {
		searchResult: SearchResult;
	} = $props();

	// ============================== CLICK FUNCS ==============================

	function onStrongsClick(): void {
		navigation.pushModule(
			Modules.STRONGS,
			REFS_VIEWS.ROOT,
			{
				bibleLocationRef:
					searchResult.key,
				refs: searchResult.strongsRefs,
				strongsWords:
					searchResult.strongsWords
			}
		);
	}

	function onVerseReferencesClick(): void {
		navigation.pushModule(
			Modules.STRONGS,
			REFS_VIEWS.ROOT,
			{
				bibleLocationRef:
					searchResult.key,
				refs: searchResult.verseRefs
			}
		);
	}

	function onCopyToClipboard(): void {
		let content = `${searchResult.bookName} ${searchResult.number}:${searchResult.verseNumber}\n${searchResult.text}`;
		navigator.clipboard.writeText(content);
		toastService.showToast(
			`Copied ${searchResult.bookName} ${searchResult.number}:${searchResult.verseNumber}`
		);
	}

	function onSplitScreenHorizontal(e: Event, bibleLocationRef: string): void {
		e.stopPropagation();

		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{ bibleLocationRef }
		);
	}

	function onSplitScreenVertical(e: Event, bibleLocationRef: string): void {
		e.stopPropagation();

		navigation.split(
			PaneSplit.VERTICAL,
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{ bibleLocationRef }
		);
	}
</script>

<div class="flex justify-end gap-2 pt-2 hover:cursor-default">
	{#if searchResult.verseRefs.length > 0}
		<KJVIconButton
			label="Open verse references"
			variant="quiet"
			onClick={() => onVerseReferencesClick()}
		>
			<Link></Link>
		</KJVIconButton>
	{/if}

	{#if searchResult.strongsRefs.length > 0}
		<KJVIconButton
			label="Open Strong's references"
			variant="quiet"
			onClick={() => onStrongsClick()}
		>
			<Dictionary></Dictionary>
		</KJVIconButton>
	{/if}

	<KJVIconButton
		label="Copy verse"
		variant="quiet"
		onClick={() => onCopyToClipboard()}
	>
		<Copy classes=""></Copy>
	</KJVIconButton>

	<KJVIconButton
		label="Split pane horizontally"
		variant="quiet"
		onClick={(e: Event) => onSplitScreenHorizontal(e, searchResult.key)}
	>
		<SplitScreenBottom></SplitScreenBottom>
	</KJVIconButton>
	<KJVIconButton
		label="Split pane vertically"
		variant="quiet"
		onClick={(e: Event) => onSplitScreenVertical(e, searchResult.key)}
	>
		<SplitScreenRight></SplitScreenRight>
	</KJVIconButton>
</div>
