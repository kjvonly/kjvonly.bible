<script lang="ts">
	import { onDestroy } from 'svelte';

	// COMPONENTS
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// NAVIGATION
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';

	// ================================ MODELS =================================

	type HoldState =
		'idle' | 'holding' | 'completed';

	// =============================== CONSTANTS ===============================

	const HOLD_DURATION_MS = 1500;
	const PROGRESS_DELAY_MS = 300;
	const PROGRESS_DURATION_MS =
		HOLD_DURATION_MS - PROGRESS_DELAY_MS;

	// ================================= VARS ==================================

	const { navigation } =
		useNavigationRuntimeContext();

	let holdState = $state<HoldState>('idle');
	let showHoldProgress = $state(false);
	let suppressNextClick = false;
	let keyboardPressActive = false;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setTimeout> | undefined;
	let clickSuppressionTimer: ReturnType<typeof setTimeout> | undefined;

	// ================================ FUNCS ==================================

	function clearHoldTimer(): void {
		if (holdTimer === undefined) {
			return;
		}

		clearTimeout(holdTimer);
		holdTimer = undefined;
	}

	function clearProgressTimer(): void {
		if (progressTimer === undefined) {
			return;
		}

		clearTimeout(progressTimer);
		progressTimer = undefined;
	}

	function clearClickSuppressionTimer(): void {
		if (clickSuppressionTimer === undefined) {
			return;
		}

		clearTimeout(clickSuppressionTimer);
		clickSuppressionTimer = undefined;
	}

	/**
	 * Begins the standard Pane Back hold gesture.
	 *
	 * The hold threshold starts immediately, but visual progress waits briefly so
	 * an ordinary tap does not flash the progress ring.
	 */
	function beginHold(): void {
		if (holdState !== 'idle') {
			return;
		}

		holdState = 'holding';
		showHoldProgress = false;

		progressTimer = setTimeout(() => {
			progressTimer = undefined;

			if (holdState === 'holding') {
				showHoldProgress = true;
			}
		}, PROGRESS_DELAY_MS);

		holdTimer = setTimeout(
			completeHold,
			HOLD_DURATION_MS
		);
	}

	/**
	 * Completes the hold gesture and exits the current Pane context.
	 */
	function completeHold(): void {
		holdTimer = undefined;
		clearProgressTimer();

		showHoldProgress = false;
		holdState = 'completed';

		navigation.escapePane();
	}

	/**
	 * Cancels an in-progress hold without erasing a completed hold marker.
	 *
	 * Keeping `completed` intact lets the following native click be consumed
	 * instead of accidentally performing Back after the Pane escape action.
	 */
	function cancelPendingHold(): void {
		clearHoldTimer();
		clearProgressTimer();
		showHoldProgress = false;

		if (holdState === 'holding') {
			holdState = 'idle';
		}
	}

	function resetHoldState(): void {
		holdState = 'idle';
	}

	/**
	 * Consumes the native click generated after a handled hold/keyboard release.
	 */
	function suppressGeneratedClick(): void {
		clearClickSuppressionTimer();
		suppressNextClick = true;

		clickSuppressionTimer = setTimeout(() => {
			clickSuppressionTimer = undefined;
			suppressNextClick = false;
			resetHoldState();
		}, 0);
	}

	function onClick(event: MouseEvent): void {
		if (
			suppressNextClick ||
			holdState === 'completed'
		) {
			event.preventDefault();
			event.stopPropagation();

			suppressNextClick = false;
			resetHoldState();
			return;
		}

		navigation.back();
	}

	function onPointerDown(
		event: PointerEvent
	): void {
		if (event.button !== 0) {
			return;
		}

		beginHold();
	}

	function onPointerUp(): void {
		const completed =
			holdState === 'completed';

		cancelPendingHold();

		if (completed) {
			suppressGeneratedClick();
		}
	}

	function onPointerCancel(): void {
		cancelPendingHold();
		resetHoldState();
	}

	function onKeyDown(
		event: KeyboardEvent
	): void {
		if (
			(event.key !== 'Enter' && event.key !== ' ') ||
			event.repeat
		) {
			return;
		}

		event.preventDefault();
		keyboardPressActive = true;
		beginHold();
	}

	function onKeyUp(
		event: KeyboardEvent
	): void {
		if (
			!keyboardPressActive ||
			(event.key !== 'Enter' && event.key !== ' ')
		) {
			return;
		}

		event.preventDefault();

		const completed =
			holdState === 'completed';

		keyboardPressActive = false;
		cancelPendingHold();
		suppressGeneratedClick();

		if (!completed) {
			navigation.back();
		}
	}

	function onBlur(): void {
		keyboardPressActive = false;
		cancelPendingHold();
		resetHoldState();
	}

	onDestroy(() => {
		clearHoldTimer();
		clearProgressTimer();
		clearClickSuppressionTimer();
	});
</script>

<!--
	Standard Pane Back control:
	- tap/click: pop one navigation entry
	- press and hold: escape the Pane through PaneNavigation.escapePane()
-->
<div class="relative h-11 w-11 shrink-0">
	<button
		type="button"
		aria-label="Back. Press and hold to exit pane."
		onclick={onClick}
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		onpointerleave={onPointerCancel}
		onpointercancel={onPointerCancel}
		onkeydown={onKeyDown}
		onkeyup={onKeyUp}
		onblur={onBlur}
		oncontextmenu={(event) => event.preventDefault()}
		class="flex h-11 min-h-[44px] w-11 min-w-[44px] touch-manipulation select-none items-center justify-center rounded-full text-neutral-700 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 {holdState === 'holding' ? 'bg-neutral-100' : 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200'}"
	>
		<ArrowBack classes="h-[1.25em] w-[1.25em]"></ArrowBack>
	</button>

	{#if showHoldProgress}
		<svg
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 h-11 w-11 -rotate-90 text-primary-500"
			viewBox="0 0 44 44"
		>
			<circle
				class="hold-progress"
				cx="22"
				cy="22"
				r="20"
				pathLength="1"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				style={`animation-duration: ${PROGRESS_DURATION_MS}ms;`}
			></circle>
		</svg>
	{/if}
</div>

<style>
	.hold-progress {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation-name: hold-progress;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}

	@keyframes hold-progress {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
