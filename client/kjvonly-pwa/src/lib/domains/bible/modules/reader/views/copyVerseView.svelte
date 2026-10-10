<script lang="ts">
	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewHeader,
		ViewBody,
		scrollTo
	} from '$lib/application/ui';

	//SVELTE
	import { onMount, untrack } from 'svelte';

	//MODELS
	import {
		Modules,
		PaneSplit,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import { BIBLE_VIEWS } from '../../../models/bible-navigation.model';
	import type { Verse } from '../../../models/bible.model';

	// SERVICES

	// COMPONENTS
	import Copy from '$lib/components/svgs/copy.svelte';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import { KJVAdaptiveHeaderTitle, KJVHeader } from '$lib/components';

	//OTHER
	import uuid4 from 'uuid4';

	// NOSTR IMPL
	import { BIBLE_CHAPTER_RESOURCE_TYPE } from '../../../resources/chapters/bible-chapter-resource';

	import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '../../../resources/booknames/bible-booknames-resource';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';
	const {
		toastService
	} = useApplicationContext();

	const {
		chapterService,
		bibleBooknamesService,
		moduleResourceSelectionResolver,
		bibleLocationReferenceService
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	// =============================== BINDINGS ================================

	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(
		paneLayout.clientHeight
	);

	const bibleLocationRef =
		getBibleLocationRef();

	// ================================= VARS ==================================
	// DOM
	let headerHeight = $state(0);
	let ID = uuid4();
	let allChecked = $state(false);
	let checked: boolean[] = $state([]);
	let verseNumbers: string[] = $state([]);
	let verses: { [verseNumber: string]: Verse } = $state({});
	let longTitle = $state('');
	let shortTitle = $state('');
	let displayLongTitle = $derived(longTitle || 'Copy verses');
	let displayShortTitle = $derived(shortTitle || displayLongTitle);
	let selectedVerseRangeText = $state('');

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		closeViewOnInvalidBibleLocationReference();
		await Promise.all([setTitle(), loadVerses()]);
		initializeCheckedVersesByIdMap();
		setSortedAscVersesKeys();
	});

	$effect(() => {
		checked;
		untrack(() => {
			setSelectedVerses();
		});
	});

	// ================================ FUNCS ==================================
	/** Loads the chapter whose verses can be selected for copy/split actions. */
	async function loadVerses() {
		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_CHAPTER_RESOURCE_TYPE
		);

		const chapter = await chapterService.get(source, bibleLocationRef);

		verses = chapter.verses;
	}

	/** Rebuilds the visible verse-number list in ascending numeric order. */
	function setSortedAscVersesKeys() {
		verseNumbers = Object.keys(verses).sort((a, b) => {
			return parseInt(a) - parseInt(b);
		});
	}

	/** Initializes one selection slot per loaded verse; all begin unchecked. */
	function initializeCheckedVersesByIdMap() {
		checked = Array<boolean>(Object.keys(verses).length);
	}

	/** Loads long/short book labels used in copy text and the adaptive header. */
	async function setTitle(): Promise<void> {
		const bookID =
			bibleLocationReferenceService.extractBookID(bibleLocationRef);

		const source = moduleResourceSelectionResolver.require(
			navigationState,
			BIBLE_BOOKNAMES_RESOURCE_TYPE
		);

		const booknames = await bibleBooknamesService.get(source);

		const bookName = booknames.booknamesById[bookID] ?? '';
		const shortBookName = booknames.shortNames[bookID] ?? bookName;

		const chapterNumber =
			bibleLocationReferenceService.extractChapter(bibleLocationRef);

		longTitle = `${bookName} ${chapterNumber}`;
		shortTitle = `${shortBookName} ${chapterNumber}`;
	}

	/**
	 * Reads the Bible location captured when the Copy Verses view was opened.
	 *
	 * The view operates on this navigation-entry location rather than following
	 * subsequent Reader location changes behind the persistent stack.
	 */
	function getBibleLocationRef(): string {
		const value =
			navigationState.state
				.bibleLocationRef;

		if (typeof value !== 'string') {
			throw new Error(
				'Invalid copy verse navigation state'
			);
		}

		return value;
	}

	/** Closes the view when its navigation payload is not at least book/chapter. */
	function closeViewOnInvalidBibleLocationReference() {
		if (bibleLocationRef.split('_').length < 2) {
			navigation.back();
		}
	}

	/** Formats all currently selected verse ranges as clipboard-ready text. */
	function getAllVerseRangeText(): string {
		let checkedVerseNumbers: number[] = getCheckedVerses();
		let verseRangesToCopy = groupConsecutiveVerseRanges(checkedVerseNumbers);
		let allVerseRangeText = verseRangesToCopy.map((verseRange) => {
			return getVerseRangeText(verseRange);
		});
		return concatVerseRangeText(allVerseRangeText);
	}

	/** Joins independently formatted verse ranges with a trailing line break. */
	function concatVerseRangeText(allVerseRangeText: string[]) {
		return allVerseRangeText
			.map((vrt: string) => {
				return `${vrt}\n`;
			})
			.join('');
	}

	/**
	 * Formats one consecutive verse range with its reference title and text.
	 *
	 * @param verseRange - Two-number inclusive `[start, end]` verse range.
	 */
	function getVerseRangeText(verseRange: number[]): string {
		let [start, end] = getStartAndEndVerseNumbers(verseRange);
		let verseRangeText = getVerseRangeTitle(start, end);
		let versesToCopy = Array.from(
			{ length: end - start + 1 },
			(_, i) => start + i
		);

		versesToCopy.forEach((verseNumber: number) => {
			let vn = `${verseNumber}`;
			verseRangeText += `${verses[vn]?.text}\n`;
		});

		return verseRangeText;
	}

	function getStartAndEndVerseNumbers(r: number[]): number[] {
		return [r[0], r[r.length - 1]];
	}

	function getVerseRangeTitle(start: number, end: number): string {
		let rangeTitle = '';
		if (start === end) {
			rangeTitle = `${longTitle}:${start}\n`;
		} else {
			rangeTitle = `${longTitle}:${start}-${end}\n`;
		}

		return rangeTitle;
	}

	function getCheckedVerses(): number[] {
		let checkedVerses: number[] = [];
		checked.forEach((c, idx) => {
			if (c) {
				checkedVerses.push(idx + 1);
			}
		});
		return checkedVerses;
	}

	/**
	 * Groups selected verse numbers into inclusive `[start, end]` ranges.
	 *
	 * A single isolated verse is represented with identical bounds. For example,
	 * `[1, 2, 3, 5]` becomes `[[1, 3], [5, 5]]`.
	 *
	 * @param checkedVerses - Ascending 1-based verse numbers selected for copy.
	 */
	function groupConsecutiveVerseRanges(checkedVerses: number[]): number[][] {
		if (checkedVerses.length === 0) {
			return [];
		}
		let groupedVerseRanges: number[][] = [];
		let verseRange: number[] = [checkedVerses[0]];
		let lastVerseNumber = checkedVerses[0];
		for (let currentVerseNumber of checkedVerses) {
			if (isInconsecutive(lastVerseNumber, currentVerseNumber)) {
				verseRange.push(lastVerseNumber);
				groupedVerseRanges.push(verseRange);
				verseRange = [currentVerseNumber];
			}
			lastVerseNumber = currentVerseNumber;
		}
		verseRange.push(lastVerseNumber);
		groupedVerseRanges.push(verseRange);
		return groupedVerseRanges;
	}

	/** Returns whether two ascending verse numbers start a new selected range. */
	function isInconsecutive(
		lastVerseNumber: number,
		currentVerseNumber: number
	) {
		return currentVerseNumber - lastVerseNumber > 1;
	}

	/** Applies the header-level select-all state to every loaded verse. */
	function toggleSelects() {
		checked = Array(Object.keys(verses).length).fill(allChecked);
	}

	/** Synchronizes the select-all control with the current per-verse selection. */
	function areAllVersesChecked() {
		allChecked = checked.filter((c) => c).length == checked.length;
	}

	/** Builds an exact Bible location for a verse in this copied chapter. */
	function getVerseBibleLocationReference(verseNumber: number) {
		let bookID = bibleLocationReferenceService.extractBookID(bibleLocationRef);
		let chapter =
			bibleLocationReferenceService.extractChapter(bibleLocationRef);
		return bibleLocationReferenceService.makeBibleLocationRef(
			bookID,
			chapter,
			verseNumber
		);
	}

	/** Recomputes the compact selected-range label shown above the verse list. */
	function setSelectedVerses() {
		let checkedVerseNumbers: number[] = getCheckedVerses();
		let verseRanges = groupConsecutiveVerseRanges(checkedVerseNumbers);
		selectedVerseRangeText = getSelectedVerseRangeVersesText(verseRanges);
	}

	function getSelectedVerseRangeVersesText(verseRanges: number[][]): string {
		return verseRanges
			?.map((vr) =>
				vr[0] === vr[vr.length - 1]
					? `${vr[0]}`
					: `${vr[0]}-${vr[vr.length - 1]}`
			)
			.join(', ');
	}

	function scrollToVerse(idx: number) {
		let id = `${ID}-vno-${idx}`;
		scrollTo(id, () => {});
	}
	// ============================== CLICK FUNCS ==============================

	/** Copies all selected verse ranges, or reports that no verses are selected. */
	function onCopy() {
		if (checked.filter((c) => c).length > 0) {
			let copyText = getAllVerseRangeText();
			navigator.clipboard.writeText(copyText);
			toastService.showToast('Copied Verses');
		} else {
			toastService.showToast('No Verses Selected');
		}
	}

	/** Toggles one row's selected state and refreshes aggregate selection UI. */
	function onVerseClicked(idx: number) {
		checked[idx] = !checked[idx];
		areAllVersesChecked();
		setSelectedVerses();
	}

	/** Copies only the requested verse without changing the row selection. */
	function onCopyVerseClicked(event: Event, verseNumber: number) {
		event.stopPropagation();

		let verseRange = [verseNumber, verseNumber];
		let copyText = getVerseRangeText(verseRange);
		navigator.clipboard.writeText(copyText);
		toastService.showToast('Copied Verses');
	}

	/** Splits a new Bible Reader horizontally at the requested exact verse. */
	function onSplitScreenHorizontal(e: Event, verseNumber: number): void {
		e.stopPropagation();
		let bibleLocationRef = getVerseBibleLocationReference(verseNumber);

		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{ bibleLocationRef }
		);
	}

	/** Splits a new Bible Reader vertically at the requested exact verse. */
	function onSplitScreenVertical(e: Event, verseNumber: number): void {
		e.stopPropagation();
		let bibleLocationRef = getVerseBibleLocationReference(verseNumber);
		navigation.split(
			PaneSplit.VERTICAL,
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{ bibleLocationRef }
		);
	}
</script>

<!--
@component
Reader child view for selecting, formatting, and copying verses from one chapter.

The Bible location is captured in this navigation entry when the view opens.
Selection state is local to the view. The view may copy all selected ranges,
copy a single verse, or split a new Bible Reader at an exact verse; it does not
change the location of the Reader underneath it.
-->

<!-- ================================ HEADER =============================== -->

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet titleContent()}
	<KJVAdaptiveHeaderTitle
		longTitle={displayLongTitle}
		shortTitle={displayShortTitle}
		secondary={longTitle ? 'Copy verses' : undefined}
	></KJVAdaptiveHeaderTitle>
{/snippet}

{#snippet header()}
	<KJVHeader
		title={displayLongTitle}
		{leadingContent}
		{titleContent}
		actions={[
			{
				icon: 'copy',
				label: 'Copy selected verses',
				onClick: onCopy
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	{@render toggleAndSelectedVerseText()}
	{@render horizontalVerses()}
	{@render checkboxAndVerse()}
{/snippet}

{#snippet toggleAndSelectedVerseText()}
	<div class="sticky top-0 flex flex-row justify-between bg-neutral-50">
		<div class="p-2">
			<label
				for="showCompleted"
				class="has-checked:bg-support-a-600 relative block h-8 max-w-14 min-w-14 rounded-full bg-neutral-300 transition-colors [-webkit-tap-highlight-color:_transparent] hover:cursor-pointer"
			>
				<input
					bind:checked={allChecked}
					onchange={toggleSelects}
					type="checkbox"
					id="showCompleted"
					class="peer sr-only"
				/>

				<span
					class="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-neutral-100 transition-[inset-inline-start] peer-checked:start-6"
				></span>
			</label>
		</div>
		<span class="flex items-center justify-center px-2 text-center"
			>{selectedVerseRangeText}</span
		>
		<span class="w-full max-w-14 min-w-14"></span>
	</div>
{/snippet}

{#snippet horizontalVerses()}
	<div class="flex flex-row">
		<div class="min-w-20 bg-neutral-50"></div>
		<div class="w-full overflow-x-scroll">
			<div class="whitespace-nowrap">
				{#each verseNumbers as vn, idx}
					<button
						onclick={() => scrollToVerse(idx)}
						class="inline-block h-10 w-16 border hover:cursor-pointer"
					>
						<span class="flex h-full items-center justify-center">
							<span>{vn}</span>
						</span>
					</button>
				{/each}
			</div>
		</div>
		<div class="min-w-14 bg-neutral-50"></div>
	</div>
{/snippet}

{#snippet checkboxAndVerse()}
	{#each verseNumbers as verseNumber, idx}
		<div
			id="{ID}-vno-{idx}"
			role="button"
			tabindex="-1"
			onkeydown={() => {}}
			onclick={() => onVerseClicked(idx)}
			class="flex flex-row items-center justify-start py-6 leading-loose hover:cursor-pointer hover:bg-neutral-100"
		>
			<div class="flex min-w-16 justify-center">
				<input
					type="checkbox"
					class="accent-support-a-600 h-5 w-5"
					bind:checked={checked[idx]}
					onclick={(event) => event.stopPropagation()}
					onchange={areAllVersesChecked}
				/>
			</div>
			<div class="flex w-full flex-col px-4">
				<span class="whitespace-normal">
					{verses[verseNumber]?.text}
				</span>
				<span class="flex-fill flex"></span>
				{@render actions(parseInt(verseNumber))}
			</div>
		</div>
	{/each}
{/snippet}
{#snippet actions(verseNumber: number)}
	<div class="flex flex-row justify-end space-x-4">
		<KJVButton
			classes=""
			onClick={(event: Event) => onCopyVerseClicked(event, verseNumber)}
		>
			<Copy classes=""></Copy>
		</KJVButton>

		<KJVButton
			classes=""
			onClick={(e: Event) => onSplitScreenHorizontal(e, verseNumber)}
		>
			<SplitScreenBottom></SplitScreenBottom>
		</KJVButton>
		<KJVButton
			classes=""
			onClick={(e: Event) => onSplitScreenVertical(e, verseNumber)}
		>
			<SplitScreenRight></SplitScreenRight>
		</KJVButton>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render header()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight} classes="">
	{@render body()}
</ViewBody>
