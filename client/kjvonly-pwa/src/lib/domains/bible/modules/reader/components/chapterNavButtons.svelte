<!-- @component
Renders previous/next Reader navigation controls. The controls adapt to ordinary
Bible chapter navigation or a reading-plan sequence and fade away while the user
is scrolling through the middle of a chapter.
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
	import { attachEvents } from '$lib/application/ui';
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
		/** Whether navigation controls are currently visible. */
		showNavButtons: boolean;
		/** Reader instance ID used to locate its scroll container. */
		ID: string;
	}

	let {
		mode = $bindable<BibleMode>(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		showNavButtons = $bindable<boolean>(),
		ID
	}: Props = $props();

	// ================================= VARS ==================================

	const REACHED_BOTTOM_THRESHOLD = 40;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		attachScrolls();
	});

	// ================================ FUNCS ==================================

	/** Attaches visibility tracking to this Reader instance's scroll container. */
	function attachScrolls() {
		attachEvents(`${ID}-scroll-container`, 'scroll', handleNavButtonVisibility);
	}

	/**
	 * Shows chapter navigation controls near the top/bottom and hides them while
	 * traversing the middle of a scrollable chapter.
	 */
	function handleNavButtonVisibility() {
		let el = document.getElementById(`${ID}-scroll-container`);
		if (!el) {
			return;
		}

		if (el.scrollTop === 0) {
			showNavButtons = true;
			return;
		}

		/** this runs before the container has time to render */
		if (el.scrollHeight + el.clientHeight + el.scrollTop === 0) {
			return;
		}
		showNavButtons = false;

		let isReachBottom =
			el.scrollHeight - el.clientHeight - el.scrollTop <=
			REACHED_BOTTOM_THRESHOLD;

		if (isReachBottom) {
			showNavButtons = true;
		}
	}

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
	<div
		style="transform: translate3d(0px, 0px, 0px);"
		class="sticky z-10 transition-opacity duration-500"
		transition:fade={{ duration: 500 }}
	>
		<div class="absolute bottom-2 left-4">
			<LeftChevron onClick={_previousChapter}></LeftChevron>
		</div>
	</div>
{/if}
{#if showNavButtons}
	<div
		style="transform: translate3d(0px, 0px, 0px); "
		class="sticky z-10 transition-opacity duration-500"
		transition:fade={{ duration: 500 }}
	>
		<div class="absolute right-4 bottom-2">
			<RightChevron onClick={_nextChapter}></RightChevron>
		</div>
	</div>
{/if}
