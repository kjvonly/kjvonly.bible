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
	} from '../../../../resources/booknames/bible-booknames-interpreter';

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

	function onToggleGoToVerses(): void {
		goToVerses = !goToVerses;
		updateState(
			'goToVerses',
			goToVerses
		);
	}

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
