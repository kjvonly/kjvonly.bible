<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// SVELTE
	import {
		onMount
	} from 'svelte';

	// APPLICATION
	import {
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';

	// COMPONENTS
	import {
		KJVAdaptiveHeaderTitle,
		KJVHeader
	} from '$lib/components';

	// MODELS
	import type {
		BibleBooknames
	} from '../../../../models/bible-booknames.model';

	// RESOURCES
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '../../../../resources/booknames/bible-booknames-resource';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	const selectedBookID =
		requireStringState(
			navigationState.state.selectedBookID,
			'selectedBookID'
		);
	const selectedChapter =
		requireStringState(
			navigationState.state.selectedChapter,
			'selectedChapter'
		);

	// ================================== VARS =================================

	let clientHeight = $derived(
		paneLayout.clientHeight
	);
	let headerHeight = $state(0);

	let booknames:
		BibleBooknames |
		undefined = $state();
	let verses: number[] = $state([]);
	let bookName = $state('');
	let shortBookName = $state('');

	let longTitle = $derived(
		bookName
			? `${bookName} ${selectedChapter}`
			: `Chapter ${selectedChapter}`
	);
	let shortTitle = $derived(
		shortBookName
			? `${shortBookName} ${selectedChapter}`
			: longTitle
	);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void loadBooknames();
	});

	// ================================ FUNCS ==================================

	/** Loads Booknames metadata used for verse count and human-readable titles. */
	async function loadBooknames(): Promise<void> {
		const source =
			moduleResourceSelectionResolver.require(
				navigationState,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);

		booknames =
			await bibleBooknamesService.get(
				source
			);

		setBookName();
		setVerses();
	}

	/** Resolves long and short display names for the selected canonical book. */
	function setBookName(): void {
		if (!booknames) {
			return;
		}

		bookName =
			booknames.booknamesById[selectedBookID] ?? '';
		shortBookName =
			booknames.shortNames[selectedBookID] ??
			bookName;
	}

	/** Builds the selectable 1-based verse-number list for the selected chapter. */
	function setVerses(): void {
		const verseCount =
			booknames
				?.bookchapterversecountById[
					selectedBookID
				]?.[
					selectedChapter
				];

		verses = verseCount
			? Array.from(
				{ length: verseCount },
				(_, index) => index + 1
			)
			: [];
	}

	/**
	 * Returns one exact Bible location to the parent navigation entry.
	 *
	 * @param verse - 1-based verse number selected by the user.
	 */
	function onVerseSelected(
		verse: number
	): void {
		void navigation.backWithResult({
			type: 'bible-location',
			bibleLocationRef:
				`${selectedBookID}_${selectedChapter}_${verse}`
		});
	}

	/**
	 * Requires one non-empty string field from this view's navigation state.
	 *
	 * @param value - Candidate serialized navigation-state value.
	 * @param key - Field name included in the invariant error.
	 */
	function requireStringState(
		value: unknown,
		key: string
	): string {
		if (
			typeof value !== 'string' ||
			value.length === 0
		) {
			throw new Error(
				`Bible verse view is missing ${key}`
			);
		}

		return value;
	}
</script>

<!--
@component
Final verse-selection step in the Reader's Book → Chapter → Verse flow.

This view reads immutable selected-book/chapter state, derives the available
verse numbers from Booknames metadata, and returns an exact Bible location with
`backWithResult(...)` when a verse is chosen.
-->

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		{longTitle}
		shortTitle={shortTitle}
		secondary="Verse"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title={longTitle}
		{leadingContent}
		{titleContent}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="grid w-[100%] grid-cols-5">
		{#each verses as verse}
			<button
				class="row-span-1 bg-neutral-50 p-4 hover:bg-neutral-100"
				onclick={() =>
					onVerseSelected(
						verse
					)}
			>
				{verse}
			</button>
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
