<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferContainer from '$lib/application/runtime/buffer/components/bufferContainer.svelte';
	import Chapter from './chapter/chapter.svelte';
	import BibleHeader from './bibleHeader.svelte';
	import ChapterNavButtons from './components/chapterNavButtons.svelte';
	import EditOptions from './chapter/editOptions.svelte';

	// MODELS
	import {
		BIBLE_MODES,
		newBibleMode
	} from '$lib/domains/bible/models/bible.model';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
	import type {
		BibleTextMarkup
	} from '$lib/domains/bible/models/bible-text-markup.model';

	// SERVICES
	import { paneService } from '$lib/application/services/pane.service.svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	// OTHER
	import uuid4 from 'uuid4';

	import { attachEvents } from '$lib/application/ui/eventHandlers';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';

	import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

	const {
		moduleResourceSelectionResolver
	} = useApplicationContext();
	// =============================== BINDINGS ================================

	let {
		paneID = $bindable<string>(),
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	// ================================= VARS ==================================

	let textMarkup: BibleTextMarkup = $state({
		id: '',
		chapterRef: '',
		markings: {}
	});
	let bibleLocationRef: string = $state('');

	let bibleVersion:
		string =
		$state(
			getBibleVersionId(
				moduleResourceSelectionResolver.require(
					paneID,
					BIBLE_CHAPTER_RESOURCE_TYPE
				)
			)
		);

	let clientHeight = $state(0);
	let headerHeight = $state(0);
	/** since the {@link header} snippet is part of the body we don't
	 * want to reduce the body height by the header height. This zero
	 * value state will ensure the body is at 100%  {@link BufferContainer}
	 */
	let zeroHeaderHeight = $state(0);
	let id = $state(uuid4());
	const LAST_BIBLE_LOCATION_REF = 'lastBibleLocationReference';
	const DEFAULT_BIBLE_LOCATION_REF = '52_10_9';
	let mode: any = $state(newBibleMode());

	// DOM related vars
	let lastKnownScrollPosition = $state(0);
	let showNavButtons = $state(true);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		setModePaneID();
		setNavReadings();
		setBibleLocationRef();
		attachScrolls();
		overrideContextMenu();
	});

	$effect(() => {
		bibleLocationRef;
		onBibleLocationRefChanged();
	});

	// ================================ FUNCS ==================================

	function setModePaneID() {
		mode.paneID = paneID;
	}

	function setNavReadings() {
		if (pane?.buffer?.bag?.navReadings) {
			mode.navReadings = pane?.buffer?.bag?.navReadings;
		}
	}

	
	function getBibleVersionId(
	source:
		PublishedResourceReference
): string {

	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	const version =
		identifier.path[0];

	if (!version) {
		throw new Error(
			`Invalid Bible Chapter Resource selection: ${source.resourceId}`
		);
	}

	return createBibleVersionId(
		source.publisher,
		version
	);
}
	function setBibleLocationRef() {
		let ref = pane.buffer.bag.bibleLocationRef;
		if (ref) {
			bibleLocationRef = ref;
		} else {
			setToLastBibleLocationRef();
		}
	}

	function setToLastBibleLocationRef() {
		let ref = localStorage.getItem(LAST_BIBLE_LOCATION_REF);
		if (!ref) {
			setDefaultBibleLocationRef();
			return;
		}
		bibleLocationRef = bibleLocationReferenceService.extractBookIDChapter(ref);
	}

	function setDefaultBibleLocationRef() {
		bibleLocationRef = DEFAULT_BIBLE_LOCATION_REF;
	}

	function overrideContextMenu() {
		attachEvents(`chapter-container-${id}`, 'contextmenu', (e) =>
			e.preventDefault()
		);
	}

	function attachScrolls() {
		attachEvents(`${id}-scroll-container`, 'scroll', trackScrollPosition);
	}

	function trackScrollPosition() {
		let el = document.getElementById(`${id}-scroll-container`);
		if (!el) {
			return;
		}
		lastKnownScrollPosition = el.scrollTop;
	}

	function onBibleLocationRefChanged() {
		if (
			!bibleLocationRef ||
			!bibleVersion
		) {
			return;
		}

		pane.buffer.bag.bibleLocationRef =
			bibleLocationRef;

		localStorage.setItem(
			LAST_BIBLE_LOCATION_REF,
			bibleLocationRef
		);
		
		paneService.save();
    }

	function onBibleVersionSelected(
	version:
		BibleVersion
): void {

	const source:
		PublishedResourceReference = {
			publisher:
				version.publisher,

			resourceId:
				`${BIBLE_CHAPTER_RESOURCE_TYPE}/${version.version}`
		};

	pane.buffer
		.resourceSelections[
			BIBLE_CHAPTER_RESOURCE_TYPE
		] =
		source;

	bibleVersion =
		version.id;

	paneService.save();
}

</script>

<!-- ================================ HEADER =============================== -->

{#snippet header()}
	<BibleHeader
		bind:mode
		bind:bibleLocationRef
		bind:bibleVersion
		bind:clientHeight
		bind:headerHeight
		{onBibleVersionSelected}
		{paneID}
	></BibleHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet body()}
	<div class="kjvonly-noselect flex justify-center">
		<div>
			<div id="chapter-container-{id}" class="w-full">
				<Chapter
					bind:bibleLocationRef
					bind:bibleVersion
					bind:id
					bind:pane
					bind:mode
					bind:textMarkup
					{lastKnownScrollPosition}
				></Chapter>
			</div>
		</div>
	</div>
{/snippet}

<!-- ================================ FOOTER =============================== -->

{#snippet footer()}
	<div class="flex w-full justify-center">
		<div class="w-full">
			{#if mode.value === BIBLE_MODES.READING}
				<ChapterNavButtons
					bind:mode
					bind:pane
					bind:bibleLocationRef
					bind:bibleVersion
					bind:showNavButtons
					ID={id}
				></ChapterNavButtons>
			{:else}
				<div
					style="transform: translate3d(0px, 0px, 0px); "
					class="sticky z-10"
				>
					<div class="absolute bottom-0 w-full">
						<EditOptions
							bind:mode
							bind:textMarkup
							{paneID}
							{bibleLocationRef}
						></EditOptions>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader
		bind:headerHeight
		classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
	>
		{#if bibleLocationRef}
			{@render header()}
		{/if}
	</BufferHeader>
	<BufferBody
		ID={id}
		bind:clientHeight
		bind:headerHeight
		classes="clear-default-classes"
	>
		{#if bibleLocationRef}
			{@render body()}
		{/if}
	</BufferBody>
	{#if bibleLocationRef}
		{@render footer()}
	{/if}
</BufferContainer>
