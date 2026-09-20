<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	// MODELS
	import { Modules } from '$lib/application';

	// SERVICES
	import { useApplicationContext } from '$lib/application';

	// COMPONENTS
	import LeftChevron from '$lib/components/buttons/chevrons/leftChevron.svelte';
	import RightChevron from '$lib/components/buttons/chevrons/rightChevron.svelte';

	// OTHER
	import { attachEvents } from '$lib/application/ui';
	import type {
		BibleMode,
		BibleReadingNavigation
	} from '../../../models/bible.model';
	import type { Pane } from '$lib/application';

	const {
		workspaceRuntime,
		bibleNavigationService
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		mode = $bindable<BibleMode>(),
		pane = $bindable<Pane>(),
		bibleLocationRef = $bindable<string>(),
		bibleVersion = $bindable<string>(),
		showNavButtons = $bindable<boolean>(),
		paneID,
		ID
	}: {
		mode: BibleMode;
		pane: Pane;
		bibleLocationRef: string;
		bibleVersion: string;
		showNavButtons: boolean;
		paneID: string;
		ID: string;
	} = $props();

	// ================================= VARS ==================================

	const REACHED_BOTTOM_THRESHOLD = 40;

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		attachScrolls();
	});

	// ================================ FUNCS ==================================

	function attachScrolls() {
		attachEvents(`${ID}-scroll-container`, 'scroll', handleNavButtonVisibility);
	}

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

	async function _nextPlanChapter(nr: BibleReadingNavigation) {
		let ci = nr.currentNavReadingsIndex;
		let nextIndex = ci + 1;
		if (nextIndex > nr.readings.bcvs.length - 1) {
			workspaceRuntime.replaceBuffer(
				paneID,
				Modules.PLANS
			);
		} else {
			nr.currentNavReadingsIndex = nextIndex;
			bibleLocationRef = nr.readings.bcvs[nextIndex].bibleLocationRef;
		}
	}

	async function _previousPlanChapter(nr: BibleReadingNavigation) {
		let ci = nr.currentNavReadingsIndex;
		let nextIndex = ci - 1;
		if (nextIndex >= 0) {
			nr.currentNavReadingsIndex = nextIndex;
			bibleLocationRef = nr.readings.bcvs[nextIndex].bibleLocationRef;
		}
	}

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
