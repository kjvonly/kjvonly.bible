<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// SVELTE
	import {
		onDestroy,
		onMount
	} from 'svelte';

	// APPLICATION
	import {
		type NavigationStateValue,
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
	import {
		BIBLE_VIEWS
	} from '../../../../models/bible-navigation.model';

	// RESOURCES
	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '../../../../resources/booknames/bible-booknames-resource';

	// RUNTIME
	import {
		forwardBibleLocationNavigationResult
	} from '../../runtime/bible-location-navigation-result';

	const {
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigationState,
		onResult,
		updateState,
		whenActive
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

	const unsubscribeNavigationResult =
		onResult(
			onNavigationResult
		);

	// ================================== VARS =================================

	let clientHeight = $derived(
		paneLayout.clientHeight
	);
	let headerHeight = $state(0);

	let booknames:
		BibleBooknames |
		undefined = $state();
	let bookName = $state('');
	let shortBookName = $state('');
	let chapters: string[] = $state([]);
	let goToVerses = $state(
		navigationState.state.goToVerses === true
	);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void loadBooknames();
	});

	onDestroy(() => {
		unsubscribeNavigationResult();
	});

	// ================================ FUNCS ==================================

	/** Loads Booknames metadata needed for chapter count and header labels. */
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
		setChapters();
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

	/** Projects the selected book's available chapter numbers in numeric order. */
	function setChapters(): void {
		if (!booknames) {
			chapters = [];
			return;
		}

		chapters = Object.keys(
			booknames
				.bookchapterversecountById[
					selectedBookID
				] ?? {}
		).sort(
			(a, b) =>
				Number(a) - Number(b)
		);
	}

	/**
	 * Forwards a verse-selection result produced by the nested verse view.
	 *
	 * The persistent navigation stack may leave this component mounted while it
	 * is hidden, so forwarding is guarded by `whenActive`.
	 */
	function onNavigationResult(
		result: NavigationStateValue
	): void {
		forwardBibleLocationNavigationResult(
			result,
			{
				navigation,
				whenActive
			}
		);
	}

	/**
	 * Selects a chapter or drills into verse selection based on `goToVerses`.
	 *
	 * When verse selection is disabled, the chapter location is returned directly
	 * to the owning Reader. Otherwise this view remains on the stack and pushes
	 * the verse child view.
	 *
	 * @param chapter - Chapter number encoded as the navigation resource key.
	 */
	function chapterSelected(
		chapter: string
	): void {
		if (goToVerses) {
			navigation.pushView(
				BIBLE_VIEWS.BOOK_CHAPTER_VERSE_VERSE,
				{
					selectedBookID,
					selectedChapter: chapter
				}
			);
			return;
		}

		void navigation.backWithResult({
			type: 'bible-location',
			bibleLocationRef:
				`${selectedBookID}_${chapter}`
		});
	}

	/** Persists whether chapter selection should immediately drill into verses. */
	function onToggleGoToVerses(): void {
		goToVerses = !goToVerses;
		updateState(
			'goToVerses',
			goToVerses
		);
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
				`Bible chapter view is missing ${key}`
			);
		}

		return value;
	}
</script>

<!--
@component
Chapter-selection step in the Reader's Book → Chapter → Verse navigation flow.

The selected book ID is immutable navigation-entry state. A chapter can either
be returned immediately as a Bible location or used to push the verse-selection
child view. Nested verse results are forwarded to the owning Reader.
-->

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle={bookName || 'Bible'}
		shortTitle={shortBookName || bookName || 'Bible'}
		secondary="Chapter"
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title={bookName || 'Chapter'}
		{leadingContent}
		{titleContent}
		actions={[
			{
				icon: 'format-list-numbered',
				label: goToVerses
					? 'Do not show verses after chapter'
					: 'Show verses after chapter',
				onClick: onToggleGoToVerses,
				selected: goToVerses
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="grid w-[100%] grid-cols-5">
		{#each chapters as chapter}
			<button
				class="row-span-1 bg-neutral-50 p-4 hover:bg-neutral-100"
				onclick={() =>
					chapterSelected(
						chapter
					)}
			>
				{chapter}
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
