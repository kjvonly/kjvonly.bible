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
		newAnnotation,
		newBibleMode,
		type Annotations
	} from '$lib/domains/bible/models/bible.model';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

	// SERVICES
	import { paneService } from '$lib/application/services/pane.service.svelte';

	// OTHER
	import uuid4 from 'uuid4';

	import { attachEvents } from '$lib/application/ui/eventHandlers';
	import { bookIDByBookNameService } from '$lib/domains/bible/services/bibleMetadata/bookIDByBookName.service';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import { bibleLocationReferenceService } from '$lib/domains/bible/services/bibleLocationReference.service';

	// NOSTR IMPL
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	const { bibleVersionsService } = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID = $bindable<string>(),
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	// ================================= VARS ==================================

	let annotations: Annotations = $state(newAnnotation());
	let bibleLocationRef: string = $state('');
	let bibleVersion: string = $state('');
	let clientHeight = $state(0);
	let headerHeight = $state(0);
	/** since the {@link header} snippet is part of the body we don't
	 * want to reduce the body height by the header height. This zero
	 * value state will ensure the body is at 100%  {@link BufferContainer}
	 */
	let zeroHeaderHeight = $state(0);
	let id = $state(uuid4());
	const LAST_BIBLE_LOCATION_REF = 'lastBibleLocationReference';
	const LAST_BIBLE_VERSION = 'lastBibleVersion';
	let mode: any = $state(newBibleMode());

	// DOM related vars
	let lastKnownScrollPosition = $state(0);
	let showNavButtons = $state(true);

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		setModePaneID();
		setNavReadings();
		await setBibleVersion();
		setBibleLocationRef();
		attachScrolls();
		overrideContextMenu();
	});

	$effect(() => {
		bibleLocationRef;
		bibleVersion;
		onBibleNavigationChanged();
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

	async function setBibleVersion():
		Promise<void> {

		const persisted =
			pane?.buffer?.bag
				?.bibleVersion ??
			localStorage.getItem(
				LAST_BIBLE_VERSION
			);

		const selected =
		await bibleVersionsService
		.resolve(
				persisted
		);

		bibleVersion =
			selected.id;

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
		let bookID = bookIDByBookNameService.get('Romans');
		let chapter = 10;
		let verse = 9;
		bibleLocationRef = `${bookID}_${chapter}_${verse}`;
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

	function onBibleNavigationChanged() {
		if (
			!bibleLocationRef ||
			!bibleVersion
		) {
			return;
		}

		pane.buffer.bag.bibleLocationRef =
			bibleLocationRef;

		pane.buffer.bag.bibleVersion =
			bibleVersion;

		localStorage.setItem(
			LAST_BIBLE_LOCATION_REF,
			bibleLocationRef
		);

		localStorage.setItem(
			LAST_BIBLE_VERSION,
			bibleVersion
		);

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
					bind:annotations
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
						<EditOptions bind:mode bind:annotations></EditOptions>
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
