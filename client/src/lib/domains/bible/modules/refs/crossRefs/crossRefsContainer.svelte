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
	import { Modules } from '$lib/models/modules.model';
	import { newCrossRef, type CrossRef } from '$lib/models/bible.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { bookNamesByIDService } from '$lib/services/bibleMetadata/bookNamesByID.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { shortBookNamesByIDService } from '$lib/services/bibleMetadata/shortBookNamesByID.service';
	import { toastService } from '$lib/services/toast.service';
	import { verseService } from '$lib/services/bible/verse.service';

	// OTHER
	import uuid4 from 'uuid4';
	import { findElement, scrollTo } from '$lib/utils/eventHandlers';
	import { sleep } from '$lib/utils/sleep';

	// =============================== BINDINGS ================================

	let {
		paneID,
		boundCrossRefs,
		bibleVersion
	}: {
		paneID: string;
		boundCrossRefs: string[];
		bibleVersion: string;
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

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		setCrossRefs();
	});

	// ================================ FUNCS ==================================
	/**
	 * Add the cross references that were passed in via the props. This will be
	 * the first entry in the crossRefMatrix.
	 */
	async function setCrossRefs(): Promise<void> {
		addCrossRefs(boundCrossRefs);
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

	async function getCrossRef(crossRef: string): Promise<CrossRef> {
		let bibleLocationRef =
			bibleLocationReferenceService.convertCrossRefToBibleLocationRef(crossRef);
		let chapterNumber =
			bibleLocationReferenceService.extractChapter(bibleLocationRef);
		let verseNumber =
			bibleLocationReferenceService.extractVerse(bibleLocationRef);
		let bookID = bibleLocationReferenceService.extractBookID(bibleLocationRef);
		let bookName = bookNamesByIDService.get(bookID);
		let verse = await verseService.get(`${bibleVersion}/${bibleLocationRef}`);
		let verseWithoutNumber = verse.text.slice(verse.text.indexOf(' ') + 1);

		return {
			crossRef: crossRef,
			bibleLocationRef: bibleLocationRef,
			bibleVersion: bibleVersion,
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
		let verse = await verseService.get(`${bibleVersion}/${bibleLocationRef}`);
		let crossRefs = [crossRef.crossRef];
		verse?.words.forEach((w: any) => {
			w.href?.forEach((ref: string) => {
				let match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
				if (match) {
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
					>{shortBookNamesByIDService.get(ref.bookId)}
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
