<script lang="ts">
	import {
		onDestroy,
		type Snippet
	} from 'svelte';

	// ================================ MODELS =================================

	type HoldState =
		'idle' | 'holding' | 'completed';

	interface Props {
		/** Accessible description for both the primary and hold interaction. */
		label: string;
		/** Primary tap/click/short-keypress action. */
		onClick: () => void;
		/** Action fired once when the hold threshold completes. */
		onHold: () => void;
		disabled?: boolean;
		holdDurationMs?: number;
		progressDelayMs?: number;
		children: Snippet;
	}

	// =============================== BINDINGS ================================

	let {
		label,
		onClick,
		onHold,
		disabled = false,
		holdDurationMs = 1500,
		progressDelayMs = 300,
		children
	}: Props = $props();

	// ================================= VARS ==================================

	let holdState = $state<HoldState>('idle');
	let showHoldProgress = $state(false);
	let suppressNextClick = false;
	let keyboardPressActive = false;
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let progressTimer: ReturnType<typeof setTimeout> | undefined;
	let clickSuppressionTimer: ReturnType<typeof setTimeout> | undefined;

	let progressDurationMs = $derived(
		Math.max(
			0,
			holdDurationMs - progressDelayMs
		)
	);

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

	/** Starts one hold gesture while delaying its progress ring for normal taps. */
	function beginHold(): void {
		if (
			disabled ||
			holdState !== 'idle'
		) {
			return;
		}

		holdState = 'holding';
		showHoldProgress = false;

		progressTimer = setTimeout(() => {
			progressTimer = undefined;

			if (holdState === 'holding') {
				showHoldProgress = true;
			}
		}, progressDelayMs);

		holdTimer = setTimeout(
			completeHold,
			holdDurationMs
		);
	}

	/** Completes the alternate hold action exactly once for the active gesture. */
	function completeHold(): void {
		holdTimer = undefined;
		clearProgressTimer();

		showHoldProgress = false;
		holdState = 'completed';

		onHold();
	}

	/** Cancels pending timers while retaining a completed marker until click suppression. */
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

	/** Consumes the native click generated after a handled hold or keyboard release. */
	function suppressGeneratedClick(): void {
		clearClickSuppressionTimer();
		suppressNextClick = true;

		clickSuppressionTimer = setTimeout(() => {
			clickSuppressionTimer = undefined;
			suppressNextClick = false;
			resetHoldState();
		}, 0);
	}

	function handleClick(event: MouseEvent): void {
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

		onClick();
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
			event.repeat ||
			disabled
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
			onClick();
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
	@component
	Reusable 44px header icon button with a primary press and an alternate
	press-and-hold action. The component owns pointer/keyboard hold timing,
	post-hold click suppression, and the delayed progress ring; callers own the
	meaning of the two actions.
-->
<div class="relative h-11 w-11 shrink-0">
	<button
		type="button"
		aria-label={label}
		{disabled}
		onclick={handleClick}
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		onpointerleave={onPointerCancel}
		onpointercancel={onPointerCancel}
		onkeydown={onKeyDown}
		onkeyup={onKeyUp}
		onblur={onBlur}
		oncontextmenu={(event) => event.preventDefault()}
		class="flex h-11 min-h-[44px] w-11 min-w-[44px] touch-manipulation select-none items-center justify-center rounded-full text-neutral-700 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-50 {holdState === 'holding' ? 'bg-neutral-100' : 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200'}"
	>
		{@render children()}
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
				style={`animation-duration: ${progressDurationMs}ms;`}
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
