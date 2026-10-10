import {
	resolveBibleWordTarget
} from './bible-word-target';
import {
	BibleTextMarkupDragGesture,
	type BibleTextMarkupDragTarget,
	type PointerPoint
} from './bible-text-markup-drag-gesture';

export type {
	BibleTextMarkupDragTarget
} from './bible-text-markup-drag-gesture';

/** Reactive callbacks consumed by the Reader-local drag action. */
export interface BibleTextMarkupDragParameters {
	/** Whether horizontal Text Markup gestures are currently eligible. */
	readonly enabled: boolean;
	/** Idempotently applies the selected markup family to one crossed token. */
	readonly onApply: (
		target: BibleTextMarkupDragTarget
	) => void;
	/** Removes only the selected markup family from one crossed token. */
	readonly onRemove: (
		target: BibleTextMarkupDragTarget
	) => void;
}

/**
 * Reader-local Svelte action that connects Pointer Events and DOM hit testing
 * to the testable drag gesture controller.
 *
 * Pointer samples are coalesced and flushed on animation frames. The gesture
 * controller owns direction/threshold semantics; this action owns DOM hit testing,
 * pointer capture, browser-event cleanup, and suppression of the click synthesized
 * after a completed drag.
 *
 * @param node - Chapter interaction root receiving pointer/click events.
 * @param initialParameters - Current enabled state and chapter mutation callbacks.
 * @returns Svelte action lifecycle hooks for updates and cleanup.
 */
export function bibleTextMarkupDrag(
	node: HTMLElement,
	initialParameters: BibleTextMarkupDragParameters
) {
	let parameters = initialParameters;
	let frameID: number | undefined;
	let queuedPoints: PointerPoint[] = [];
	const view = node.ownerDocument.defaultView;

	const gesture = new BibleTextMarkupDragGesture({
		resolveTarget: (point) =>
			resolveTargetAtPoint(
			node,
			point
		),
		onApply: (target) =>
			parameters.onApply(target),
		onRemove: (target) =>
			parameters.onRemove(target),
		onDragStart: (pointerId) => {
			try {
				node.setPointerCapture(pointerId);
			} catch {
				// Pointer capture is an enhancement; hit testing remains coordinate-based.
			}
		},
		onDragEnd: (pointerId) => {
			if (
				node.hasPointerCapture?.(pointerId)
			) {
				node.releasePointerCapture(pointerId);
			}
		}
	});

	gesture.setEnabled(parameters.enabled);

	/** Schedules one animation-frame flush for queued pointer samples. */
	function requestFrame(): void {
		if (
			frameID !== undefined ||
			queuedPoints.length === 0
		) {
			return;
		}

		frameID = view?.requestAnimationFrame(
			flushQueuedPoints
		) ?? undefined;

		if (frameID === undefined) {
			flushQueuedPoints();
		}
	}

	/** Replays queued pointer samples through the DOM-independent gesture state. */
	function flushQueuedPoints(): void {
		frameID = undefined;
		const points = queuedPoints;
		queuedPoints = [];

		for (const point of points) {
			gesture.pointerMove(
				activePointerId,
				point
			);
		}

		if (!gesture.isTracking()) {
			activePointerId = -1;
		}
	}

	let activePointerId = -1;

	/** Begins tracking when the gesture controller accepts the primary pointer. */
	function onPointerDown(event: PointerEvent): void {
		const accepted =
			gesture.pointerDown(
				event.pointerId,
				{
					x: event.clientX,
					y: event.clientY
				},
				event.isPrimary,
				event.button
			);

		if (!accepted) {
			return;
		}

		activePointerId = event.pointerId;
		queuedPoints = [];
	}

	/** Queues coalesced pointer samples while preserving native vertical scrolling. */
	function onPointerMove(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}

		const coalesced =
			event.getCoalescedEvents?.() ?? [];
		const events =
			coalesced.length > 0
				? coalesced
				: [event];

		for (const sample of events) {
			queuedPoints.push({
				x: sample.clientX,
				y: sample.clientY
			});
		}

		if (gesture.isDragging()) {
			event.preventDefault();
		}

		requestFrame();
	}

	/** Flushes the final samples and completes the active stroke. */
	function onPointerUp(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}

		cancelFrame();
		flushQueuedPoints();
		gesture.pointerUp(event.pointerId);
		activePointerId = -1;
	}

	/** Abandons queued samples and cancels the active pointer stroke. */
	function onPointerCancel(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}

		queuedPoints = [];
		cancelFrame();
		gesture.pointerCancel(event.pointerId);
		activePointerId = -1;
	}

	/** Consumes the synthetic click generated after a completed horizontal drag. */
	function onClick(event: MouseEvent): void {
		if (!gesture.consumeSuppressedClick()) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	/** Cancels a scheduled pointer-sample flush, if one is pending. */
	function cancelFrame(): void {
		if (
			frameID === undefined ||
			!view
		) {
			return;
		}

		view.cancelAnimationFrame(frameID);
		frameID = undefined;
	}

	node.addEventListener(
		'pointerdown',
		onPointerDown
	);
	node.addEventListener(
		'pointermove',
		onPointerMove
	);
	node.addEventListener(
		'pointerup',
		onPointerUp
	);
	node.addEventListener(
		'pointercancel',
		onPointerCancel
	);
	node.addEventListener(
		'click',
		onClick,
		true
	);

	return {
		update(nextParameters: BibleTextMarkupDragParameters) {
			parameters = nextParameters;
			gesture.setEnabled(
				parameters.enabled
			);

			if (!parameters.enabled) {
				queuedPoints = [];
				cancelFrame();
				activePointerId = -1;
			}
		},
		destroy() {
			queuedPoints = [];
			cancelFrame();
			gesture.cancel();
			node.removeEventListener(
				'pointerdown',
				onPointerDown
			);
			node.removeEventListener(
				'pointermove',
				onPointerMove
			);
			node.removeEventListener(
				'pointerup',
				onPointerUp
			);
			node.removeEventListener(
				'pointercancel',
				onPointerCancel
			);
			node.removeEventListener(
				'click',
				onClick,
				true
			);
		}
	};
}

/**
 * Resolves viewport coordinates to the semantic Bible token under the pointer.
 *
 * Browser geometry stays in this DOM adapter; the gesture controller receives
 * only semantic `{ verseNumber, wordIndex }` identities.
 */
function resolveTargetAtPoint(
	root: HTMLElement,
	point: PointerPoint
): BibleTextMarkupDragTarget | undefined {
	const element =
		root.ownerDocument.elementFromPoint(
			point.x,
			point.y
		);
	return resolveBibleWordTarget(
		root,
		element
	);
}
