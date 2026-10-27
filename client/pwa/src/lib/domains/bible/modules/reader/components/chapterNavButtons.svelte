<!-- @component
Renders previous/next Reader navigation controls. The controls adapt to ordinary
Bible chapter navigation or a reading-plan sequence. Like the normalized Reader,
they hide while scrolling down and reappear when scrolling up or reaching an edge.
-->
<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	// SERVICES
	import {
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext
	} from '$lib/application';

	// COMPONENTS
	import LeftChevron from '$lib/components/buttons/chevrons/leftChevron.svelte';
	import RightChevron from '$lib/components/buttons/chevrons/rightChevron.svelte';

	// OTHER
	import { ChapterNavScrollVisibility } from './chapter-nav-scroll-visibility';
	import type {
		BibleMode,
		BibleReadingNavigation
	} from '../../../models/bible.model';

	const {
		bibleNavigationService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	// =============================== BINDINGS ================================

	interface Props {
		/** Reader mode; `navReadings` switches controls to reading-plan traversal. */
		mode: BibleMode;
		/** Active canonical Bible location mutated by previous/next navigation. */
		bibleLocationRef: string;
		/** Active Bible version ID retained with this Reader instance. */
		bibleVersion: string;
		/** Reader instance ID used to locate its scroll container. */
		ID: string;
	}

	let {
		mode = $bindable<BibleMode>(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		ID
	}: Props = $props();

	// ================================= VARS ==================================

	let showNavButtons = $state(true);
	const scrollVisibility = new ChapterNavScrollVisibility();

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		// The Reader's existing ViewBody is the only scroll owner.
		const scrollContainer = document.getElementById(`${ID}-scroll-container`);
		if (!scrollContainer) {
			return;
		}

		scrollVisibility.reset(scrollContainer.scrollTop);
		const updateVisibility = () => {
			showNavButtons = scrollVisibility.update(scrollContainer);
		};

		scrollContainer.addEventListener('scroll', updateVisibility, {
			passive: true
		});
		updateVisibility();
		return () => scrollContainer.removeEventListener('scroll', updateVisibility);
	});

	let previousLocationRef = bibleLocationRef;
	$effect(() => {
		// Show the controls when navigation changes the active chapter/verse.
		if (bibleLocationRef !== previousLocationRef) {
			previousLocationRef = bibleLocationRef;
			scrollVisibility.reset(
				document.getElementById(`${ID}-scroll-container`)?.scrollTop ?? 0
			);
			showNavButtons = true;
		}
	});

	// ============================== CLICK FUNCS ==============================

	/**
	 * Advances within a reading-plan sequence or returns its configured result
	 * when the final reading has been completed.
	 *
	 * @param nr - Mutable reading-plan navigation state owned by this Reader.
	 */
	async function _nextPlanChapter(nr: BibleReadingNavigation) {
		let ci = nr.currentNavReadingsIndex;
		let nextIndex = ci + 1;
		if (nextIndex > nr.readings.bcvs.length - 1) {
			const returnResult =
				navigationState.state.returnResult;

			if (returnResult !== undefined) {
				await navigation.backWithResult(
					returnResult
				);
				return;
			}

			navigation.back();
		} else {
			nr.currentNavReadingsIndex = nextIndex;
			bibleLocationRef = nr.readings.bcvs[nextIndex].bibleLocationRef;
		}
	}

	/**
	 * Moves to the previous entry in the active reading-plan sequence.
	 *
	 * @param nr - Mutable reading-plan navigation state owned by this Reader.
	 */
	async function _previousPlanChapter(nr: BibleReadingNavigation) {
		let ci = nr.currentNavReadingsIndex;
		let nextIndex = ci - 1;
		if (nextIndex >= 0) {
			nr.currentNavReadingsIndex = nextIndex;
			bibleLocationRef = nr.readings.bcvs[nextIndex].bibleLocationRef;
		}
	}

	/** Handles the Next control using plan traversal or ordinary Bible navigation. */
	async function _nextChapter(e: Event) {
		e.stopPropagation();
		if (mode.navReadings) {
			_nextPlanChapter(mode.navReadings);
			return;
		}
		if (bibleLocationRef) {
			bibleLocationRef = bibleNavigationService.next(bibleLocationRef);
		}
	}

	/** Handles the Previous control using plan traversal or ordinary Bible navigation. */
	async function _previousChapter(e: Event) {
		e.stopPropagation();
		if (mode.navReadings) {
			_previousPlanChapter(mode.navReadings);
			return;
		}

		if (bibleLocationRef) {
			bibleLocationRef = bibleNavigationService.previous(bibleLocationRef);
		}
	}
</script>

{#if showNavButtons}
	<div class="pointer-events-none relative z-10 h-0 w-full" transition:fade={{ duration: 500 }}>
		<div class="pointer-events-auto absolute bottom-2 left-4">
			<LeftChevron
				ariaLabel={mode.navReadings ? 'Previous reading' : 'Previous chapter'}
				onClick={_previousChapter}></LeftChevron>
		</div>
		<div class="pointer-events-auto absolute right-4 bottom-2">
			<RightChevron
				ariaLabel={mode.navReadings ? 'Next reading' : 'Next chapter'}
				onClick={_nextChapter}></RightChevron>
		</div>
	</div>
{/if}
