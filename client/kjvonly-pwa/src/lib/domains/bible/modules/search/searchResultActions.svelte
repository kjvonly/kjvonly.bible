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

	// MODELS
	import {
		BIBLE_VIEWS
	} from '../../models/bible-navigation.model';

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
	} = $props();

	// ============================== CLICK FUNCS ==============================

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
