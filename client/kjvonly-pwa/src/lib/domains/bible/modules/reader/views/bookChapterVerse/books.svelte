<script lang="ts">
	// ================================ IMPORTS ================================

	// SVELTE
	import {
		onDestroy,
		onMount,
		untrack
	} from 'svelte';

	// APPLICATION
	import {
		type NavigationStateValue,
	useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import {
		ViewBody,
		ViewHeader
	} from '$lib/application/ui';

	// COMPONENTS
	import {
		KJVHeader
	} from '$lib/components';

	// MODELS
	import type {
		Book,
		BookGrouping
	} from '../../../../models/bible.model';
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
		bookGroupingsService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigationState,
		onResult,
		whenActive
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const paneLayout = usePaneLayoutContext();

	const unsubscribeNavigationResult =
		onResult(
			onNavigationResult
		);

	// ================================== VARS =================================

	let clientHeight = $derived(
		paneLayout.clientHeight
	);
	let clientWidth = $state(0);
	let headerHeight = $state(0);

	let booknames:
		BibleBooknames |
		undefined = $state();
	let bookGroups:
		{ [bookID: string]: BookGrouping } = $state({});
	let bookNamesSorted: Book[] = $state([]);
	let filteredBooks: Book[] = $state([]);
	let filterText = $state('');
	let showBookByGroup = $state(true);
	let showBookByList = $state(false);
	let alphaNumeric = $state(false);

	const colorByGroupName:
		{ [groupName: string]: { color: string } } = {
			law: { color: 'decoration-primary-500' },
			history: { color: 'decoration-support-a-500' },
			poetry: { color: 'decoration-support-b-500' },
			'major prophets': { color: 'decoration-primary-300' },
			'minor prophets': { color: 'decoration-support-a-300' },
			gospel: { color: 'decoration-support-b-300' },
			acts: { color: 'decoration-primary-700' },
			'epistles of Paul': { color: 'decoration-support-a-700' },
			letters: { color: 'decoration-support-b-700' },
			prophecy: { color: 'decoration-primary-500' }
		};

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		void loadBooknames();
		setBookGroupings();
	});

	onDestroy(() => {
		unsubscribeNavigationResult();
	});

	$effect(() => {
		filterText;
		alphaNumeric;
		booknames;

		untrack(() => {
			filterBooks();
		});
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

		setBookNames();
	}

	function setBookNames(): void {
		if (!booknames) {
			bookNamesSorted = [];
			filteredBooks = [];
			return;
		}

		bookNamesSorted = Object.entries(
			booknames.booknamesById
		)
			.sort(
				(a, b) =>
					Number(a[0]) - Number(b[0])
			)
			.map(
				([id, name]) => ({
					id,
					name
				})
			);

		filterBooks();
	}

	function filterBooks(): void {
		const books = alphaNumeric
			? [...bookNamesSorted].sort(
				(a, b) =>
					a.name.localeCompare(
						b.name,
						undefined,
						{
							numeric: true,
							sensitivity: 'base'
						}
					)
			)
			: bookNamesSorted;

		filteredBooks = books.filter(
			(book) =>
				book.name
					.toLowerCase()
					.includes(
						filterText.toLowerCase()
					)
		);
	}

	function setBookGroupings(): void {
		bookGroups =
			bookGroupingsService.bookGroups;
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

	function gridBookName(
		book: Book
	): string {
		if (!booknames) {
			return book.name;
		}

		if (alphaNumeric) {
			return (
				booknames.shortNames[book.id] ??
				book.name
			);
		}

		return (
			bookGroups[book.id]?.name ??
			book.name
		);
	}

	function gridBookClasses(
		book: Book
	): string {
		if (alphaNumeric) {
			return '';
		}

		const groupName =
			bookGroups[book.id]?.group;
		const color = groupName
			? colorByGroupName[groupName]?.color
			: undefined;

		return color
			? `underline decoration-8 underline-offset-8 ${color}`
			: '';
	}

	// ============================== CLICK FUNCS ==============================

	function onListClick(): void {
		showBookByGroup = false;
		showBookByList = true;
	}

	function onGridClick(): void {
		showBookByGroup = true;
		showBookByList = false;
	}

	function onAlphaNumericClick(): void {
		alphaNumeric = !alphaNumeric;
	}

	function onBookSelected(
		event: Event,
		bookID: string
	): void {
		event.stopPropagation();

		navigation.pushView(
			BIBLE_VIEWS.BOOK_CHAPTER_VERSE_CHAPTER,
			{
				selectedBookID: bookID
			}
		);
	}
</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<KJVHeader
		title="Book"
		leadingAction={{
			icon: 'arrow-back',
			label: 'Back',
			onClick: () => navigation.back()
		}}
		actions={[
			showBookByGroup
				? {
					icon: 'list',
					label: 'Show books as list',
					onClick: onListClick
				}
				: {
					icon: 'grid',
					label: 'Show books by group',
					onClick: onGridClick
				},
			{
				icon: 'alpha-numeric',
				label: alphaNumeric
					? 'Use Bible book order'
					: 'Sort books alphanumerically',
				onClick: onAlphaNumericClick,
				selected: alphaNumeric
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{@render filterInput()}
	{@render listBody()}
	{@render gridBody()}
{/snippet}

{#snippet filterInput()}
	<div
		bind:clientWidth
		class="sticky top-0 bg-neutral-50 px-4 py-2"
	>
		<label class="sr-only" for="name">Name</label>
		<input
			class="border-primary-500 w-full border-b-1 outline-none"
			placeholder="filter books"
			type="text"
			id="name"
			bind:value={filterText}
		/>
	</div>
{/snippet}

{#snippet gridBody()}
	{#if showBookByGroup}
		<div
			class="grid w-full {clientWidth < 250
				? 'grid-cols-3'
				: 'grid-cols-5'} gap-1"
		>
			{#each filteredBooks as book}
				<button
					onclick={(event) =>
						onBookSelected(
							event,
							book.id
						)}
					class="cols-span-1 py-6 text-center text-wrap hover:bg-neutral-100 {gridBookClasses(book)}"
				>
					{gridBookName(book)}
				</button>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet listBody()}
	{#if showBookByList}
		{#each filteredBooks as book}
			<div class="w-full">
				<button
					onclick={(event) =>
						onBookSelected(
							event,
							book.id
						)}
					class="w-full bg-neutral-50 p-4 text-start hover:bg-neutral-100"
				>
					{book.name}
				</button>
			</div>
		{/each}
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody classes="" {clientHeight} {headerHeight}>
	{@render body()}
</ViewBody>
