<script lang="ts">
	// ================================ IMPORTS ================================

	// MODELS / APPLICATION
	import {
		Modules,
		MODULES_VIEWS,
		PaneSplit,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	import {
		BufferBody,
		BufferHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	import {
		BIBLE_VIEWS
	} from '../../../models/bible-navigation.model';
	import { SEARCH_VIEWS } from '../../../models/search-navigation.model';
	import { NOTES_VIEWS } from '$lib/domains/notes';

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	let {
		clientHeight,
		obj: _obj
	}: {
		clientHeight: number;
		obj: Record<string, unknown>;
	} = $props();

	void _obj;

	let headerHeight = $state(0);

	let actions: Record<string, () => void> = {
		'copy verses': () => {
			const bibleLocationRef =
				navigationState.state
					.bibleLocationRef;

			if (typeof bibleLocationRef !== 'string') {
				throw new Error(
					'Bible menu is missing Bible location state'
				);
			}

			closeMenuAndNavigate(() => {
				navigation.pushView(
					BIBLE_VIEWS.COPY_VERSE,
					{ bibleLocationRef }
				);
			});
		},
		'bible version': () => {
			closeMenuAndNavigate(() => {
				navigation.pushView(
					BIBLE_VIEWS.VERSION,
					{}
				);
			});
		},
		search: () => {
			closeMenuAndNavigate(() => {
				navigation.pushModule(
					Modules.SEARCH,
					SEARCH_VIEWS.RESULTS,
					{}
				);
			});
		},
		notes: () => {
			closeMenuAndNavigate(() => {
				navigation.pushModule(
					Modules.NOTES,
					NOTES_VIEWS.ROOT,
					{}
				);
			});
		},
		'split vertical': () => {
			closeMenuAndNavigate(() => {
				navigation.split(
					PaneSplit.VERTICAL,
					Modules.MODULES,
					MODULES_VIEWS.ROOT,
					{}
				);
			});
		},
		'split horizontal': () => {
			closeMenuAndNavigate(() => {
				navigation.split(
					PaneSplit.HORIZONTAL,
					Modules.MODULES,
					MODULES_VIEWS.ROOT,
					{}
				);
			});
		},
		close: () => {
			// Remove the menu entry, then close the underlying Bible reader.
			navigation.back();
			navigation.back();
		}
	};

	/**
	 * Removes the menu entry before opening its destination so bible.reader
	 * remains the direct parent of the next view and can receive results.
	 */
	function closeMenuAndNavigate(
		navigate: () => void
	): void {
		navigation.back();
		navigate();
	}

	function onBack(): void {
		navigation.back();
	}
</script>

<BufferHeader bind:headerHeight>
	<KJVButton onClick={onBack} classes="">
		<ArrowBack classes=""></ArrowBack>
	</KJVButton>
</BufferHeader>

<BufferBody
	{clientHeight}
	{headerHeight}
	classes={'remove-default-class'}
>
	{#each Object.keys(actions) as action}
		<div class="w-full">
			<button
				onclick={() => actions[action]()}
				class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-neutral-100"
			>
				{action}
			</button>
		</div>
	{/each}
</BufferBody>
