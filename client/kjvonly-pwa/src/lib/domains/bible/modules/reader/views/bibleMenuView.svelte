<script lang="ts">
	// ================================ IMPORTS ================================

	// APPLICATION
	import {
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// MODELS
	import {
		BIBLE_MENU_ACTIONS,
		BIBLE_NAVIGATION_RESULTS,
		type BibleMenuAction
	} from '../../../models/bible-navigation.model';

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	let headerHeight = $state(0);

	const actions: Record<string, BibleMenuAction> = {
		'copy verses':
			BIBLE_MENU_ACTIONS.COPY_VERSES,
		'bible version':
			BIBLE_MENU_ACTIONS.BIBLE_VERSION,
		search:
			BIBLE_MENU_ACTIONS.SEARCH,
		notes:
			BIBLE_MENU_ACTIONS.NOTES,
		'split vertical':
			BIBLE_MENU_ACTIONS.SPLIT_VERTICAL,
		'split horizontal':
			BIBLE_MENU_ACTIONS.SPLIT_HORIZONTAL,
		close:
			BIBLE_MENU_ACTIONS.CLOSE
	};

	/**
	 * Returns the selected menu action to the owning Bible reader.
	 *
	 * The menu does not manipulate sibling stack entries itself. The reader
	 * interprets the action after this menu entry is popped.
	 */
	async function onAction(
		action: BibleMenuAction
	): Promise<void> {
		await navigation.backWithResult({
			type:
				BIBLE_NAVIGATION_RESULTS.MENU_ACTION,
			action
		});
	}

	function onBack(): void {
		navigation.back();
	}
</script>

<ViewHeader bind:headerHeight>
	<KJVButton onClick={onBack} classes="">
		<ArrowBack classes=""></ArrowBack>
	</KJVButton>
</ViewHeader>

<ViewBody
	{clientHeight}
	{headerHeight}
	classes={'remove-default-class'}
>
	{#each Object.entries(actions) as [label, action]}
		<div class="w-full">
			<button
				onclick={() => void onAction(action)}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>
				{label}
			</button>
		</div>
	{/each}
</ViewBody>
