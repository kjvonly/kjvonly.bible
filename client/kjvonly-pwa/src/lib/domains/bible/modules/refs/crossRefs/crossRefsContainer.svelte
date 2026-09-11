<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// // SVG
	import Copy from '$lib/components/svgs/copy.svelte';
	import KeyboardArrowRight from '$lib/components/svgs/keyboardArrowRight.svelte';
	import KeyboardArrowDown from '$lib/components/svgs/keyboardArrowDown.svelte';
	import MenuBook from '$lib/components/svgs/menuBook.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';

	// MODELS
	import { Modules } from '$lib/application/models/modules.model';
	import { newCrossRef, type CrossRef } from '$lib/domains/bible/models/bible.model';
	import type { BibleBooknames } from '$lib/domains/bible/models/bible-booknames.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';
	import { paneService } from '$lib/application/services/pane.service.svelte';
	import { toastService } from '$lib/application/services/toast.service';

	// OTHER
	import uuid4 from 'uuid4';
	import { findElement, scrollTo } from '$lib/application/ui/eventHandlers';
	import { sleep } from '$lib/infrastructure/utils/sleep';

	// APPLICATION
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	const {
		verseService,
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	import {
		requireResourceSelection
	} from '$lib/application/resources/resource-selections';

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE
	} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

	import {
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

	import {
		isCrossReference,
		tokenizeReferences
	} from '../../../services/reference-tokenizer.service';

	// =============================== BINDINGS ================================

	let {
		paneID,
		boundCrossRefs
	}: {
		paneID: string;
		boundCrossRefs: string[];
	} = $props();

	// ================================== VARS =================================

	let ID = uuid4();
	/**
	 * A user can click on a cross reference to view the clicked cross reference
	 * cross references. We store the cross references for each verse clicked
	 * in the cross reference matrix. The verse that was clicked is the first
	 * cross reference in the array.
	 */
	let crossRefMatrix: CrossRef[][] = [];
	let toggleCrossRefs = $state(false);
	let currentCrossRefs: CrossRef[] = $state([]);
	let currentCrossRef: CrossRef = $state(newCrossRef());
	let breadcrumbCrossRefs: CrossRef[] = $state([]);
	let booknames: BibleBooknames | undefined = $state();

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		await loadBooknames();
		await setCrossRefs();
	});

	// ================================ FUNCS ==================================
	/**
	 * Add the cross references that were passed in via the props. This will be
	 * the first entry in the crossRefMatrix.
	 */
	async function setCrossRefs(): Promise<void> {
		addCrossRefs(boundCrossRefs);
	}

	async function loadBooknames(): Promise<void> {
		const source =
			moduleResourceSelectionResolver.require(
				paneID,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);

		booknames = await bibleBooknamesService.get(source);
	}

	async function addCrossRefs(crossRefs: string[]): Promise<void> {
		let verseCrossRefs: CrossRef[] = [];
		for (let crossRefStr of crossRefs) {
			try {
				let crossRef = await getCrossRef(crossRefStr);
				verseCrossRefs.push(crossRef);
			} catch (ex) {
				console.log(`error fetching ref ${crossRefStr} : ${ex}`);
			}
		}
		crossRefMatrix.push(verseCrossRefs);
		updateCurrentCrossRefs();
	}

	function requireChapterSelection() {
		const pane = paneService.findNode(
			paneService.rootPane,
			paneID
		);

		if (!pane) {
			throw new Error(`Refs Pane not found: ${paneID}`);
		}

		return requireResourceSelection(
			pane.buffer.resourceSelections,
			BIBLE_CHAPTER_RESOURCE_TYPE
		);
	}

	async function getCrossRef(crossRef: string): Promise<CrossRef> {
		let bibleLocationRef =
			bibleLocationReferenceService.convertCrossRefToBibleLocationRef(crossRef);
		let chapterNumber =
			bibleLocationReferenceService.extractChapter(bibleLocationRef);
		let verseNumber =
			bibleLocationReferenceService.extractVerse(bibleLocationRef);
		let bookID = bibleLocationReferenceService.extractBookID(bibleLocationRef);
		let bookName = booknames?.booknamesById[bookID] ?? '';
		const verse = await verseService.get(
			requireChapterSelection(),
			bibleLocationRef
		);
	
		let verseWithoutNumber = verse.text.slice(verse.text.indexOf(' ') + 1);

		return {
			crossRef: crossRef,
			bibleLocationRef: bibleLocationRef,
			bookName: bookName,
			chapterNumber: chapterNumber,
			verseNumber: verseNumber,
			text: verseWithoutNumber,
			bookId: bookID
		};
	}

	async function updateCurrentCrossRefs(): Promise<void> {
		if (crossRefMatrix.length > 0) {
			currentCrossRef = crossRefMatrix[crossRefMatrix.length - 1][0];
			currentCrossRefs = crossRefMatrix[crossRefMatrix.length - 1].slice(1);

			let breadcrumbs: CrossRef[] = [];
			crossRefMatrix.forEach((crossRefs: CrossRef[]) => {
				breadcrumbs.push(crossRefs[0]);
			});
			breadcrumbCrossRefs = breadcrumbs;
			scrollToBreadcrumbs();
		}
	}

	async function scrollToBreadcrumbs(): Promise<void> {
		let breadcrumbsID = `${ID}-cross-refs-spacer`;
		let el = document.getElementById(breadcrumbsID);

		if (!el) {
			await sleep(10);
			el = await findElement(breadcrumbsID);
		}

		if (!el) {
			return;
		}
		el?.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
			inline: 'start'
		});
	}

	function copyToClipboard(e: Event, crossRef: CrossRef) {
		e.stopPropagation();
		let verse = `${crossRef.bookName} ${crossRef.chapterNumber}:${crossRef.verseNumber}\n${crossRef.text}`;
		navigator.clipboard.writeText(verse);
		toastService.showToast('Copied Verse');
	}

	// ============================== CLICK FUNCS ==============================

	async function onCrossRefClicked(crossRef: CrossRef) {
		let bibleLocationRef =
			bibleLocationReferenceService.convertCrossRefToBibleLocationRef(
				crossRef.crossRef
			);
		const verse = await verseService.get(
			requireChapterSelection(),
			bibleLocationRef
		);
		let crossRefs = [crossRef.crossRef];
		verse?.words.forEach((w: any) => {
			const refs = tokenizeReferences(
				w.href ?? []
			);

			refs.forEach((ref: string) => {
				if (isCrossReference(ref)) {
					crossRefs.push(ref);
				}
			});
		});
		addCrossRefs(crossRefs);
	}

	function onBreadcrumbCrossRefClicked(idx: number): void {
		if (idx <= crossRefMatrix.length - 1) {
			crossRefMatrix.splice(idx, crossRefMatrix.length);
		}
		updateCurrentCrossRefs();
	}

	function onToggle(): void {
		toggleCrossRefs = !toggleCrossRefs;
		scrollToBreadcrumbs();
	}

	function onSplitScreenHorizontal(e: Event, crossRef: CrossRef): void {
		e.stopPropagation();
		paneService.onSplitPane(paneID, 'h', Modules.BIBLE, {
			bibleLocationRef: `${crossRef.bookId}_${crossRef.chapterNumber}_${crossRef.verseNumber}`
		});
	}

	function onSplitScreenVertical(e: Event, crossRef: CrossRef): void {
		e.stopPropagation();
		paneService.onSplitPane(paneID, 'v', Modules.BIBLE, {
			bibleLocationRef: `${crossRef.bookId}_${crossRef.chapterNumber}_${crossRef.verseNumber}`
		});
	}
</script>

<!-- ================================= BODY ================================ -->
{#snippet actions(crossRef: CrossRef)}
	<div class="flex flex-row justify-end space-x-4 py-2">
		<KJVButton classes="" onClick={(e: Event) => copyToClipboard(e, crossRef)}>
			<Copy></Copy>
		</KJVButton>

		<KJVButton
			classes=""
			onClick={(e: Event) => onSplitScreenHorizontal(e, crossRef)}
		>
			<SplitScreenBottom></SplitScreenBottom>
		</KJVButton>

		<KJVButton
			classes=""
			onClick={(e: Event) => onSplitScreenVertical(e, crossRef)}
		>
			<SplitScreenRight></SplitScreenRight>
		</KJVButton>
	</div>
{/snippet}

{#snippet firstCrossRefListItem()}
	{#if currentCrossRef}
		<p class="px-4 py-2 text-left">
			<span class="font-bold text-neutral-500"
				>{currentCrossRef.bookName}
				{currentCrossRef.chapterNumber}:{currentCrossRef.verseNumber}</span
			><br />
			{#each currentCrossRef.text.trim().split(' ') as w}
				<span class="inline-block">{w}</span>&nbsp;
			{/each}
			{@render actions(currentCrossRef)}
		</p>
	{/if}
{/snippet}

{#snippet crossRefListItem(crossRef: CrossRef)}
	{#if crossRef}
		<div class="hover:bg-primary-100 flex w-full">
			<button class="w-full" onclick={() => onCrossRefClicked(crossRef)}>
				<p class=" px-4 py-2 text-left">
					<span class="font-bold text-neutral-500"
						>{crossRef.bookName}
						{crossRef.chapterNumber}:{crossRef.verseNumber}</span
					><br />

					{#each crossRef.text.trim().split(' ') as w}<span
							><span class="inline-block">{w}&nbsp;</span><span></span></span
						>
					{/each}
					{@render actions(crossRef)}
				</p>
			</button>
		</div>
	{/if}
{/snippet}

<!-- ================================ HEADER =============================== -->
{#snippet crossRefsToggle()}
	<div class="flex flex-row items-center">
		<KJVButton classes="" onClick={onToggle}>
			{#if !toggleCrossRefs}
				<KeyboardArrowRight></KeyboardArrowRight>
			{:else}
				<KeyboardArrowDown></KeyboardArrowDown>
			{/if}
		</KJVButton>
		<MenuBook></MenuBook>
		<p class="ps-1 pe-4 capitalize">Cross References</p>
	</div>
{/snippet}

{#snippet breadcrumbs()}
	<div
		class="outline-t sticky top-0 flex flex-wrap border-t border-b border-neutral-400 bg-neutral-50 px-4 py-2"
	>
		{#each breadcrumbCrossRefs as ref, idx}
			{#if idx !== 0}
				<span class="flex items-center">
					<KeyboardArrowRight classes=""></KeyboardArrowRight>
				</span>
			{/if}
			<button
				onclick={() => {
					onBreadcrumbCrossRefClicked(idx + 1);
				}}
			>
				<span
					>{booknames?.shortNames[ref.bookId] ?? ''}
					{ref.chapterNumber}:{ref.verseNumber}</span
				></button
			>
		{/each}
	</div>
{/snippet}

{#snippet crossRefList()}
	<div class="py-2">
		{@render firstCrossRefListItem()}

		{#each currentCrossRefs as crossRef}
			{@render crossRefListItem(crossRef)}
		{/each}
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<div>
	<div id={ID}>
		{@render crossRefsToggle()}
		{#if toggleCrossRefs}
			<div class="ps-2">
				{@render breadcrumbs()}
				<div id="{ID}-cross-refs-spacer" class="py-4"></div>
				{@render crossRefList()}
			</div>
		{/if}
	</div>
</div>
