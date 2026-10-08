import {
	BibleTextMarkupDragGesture,
	type BibleTextMarkupDragTarget,
	type PointerPoint
} from './bible-text-markup-drag-gesture';

export type {
	BibleTextMarkupDragTarget
} from './bible-text-markup-drag-gesture';

export interface BibleTextMarkupDragParameters {
	readonly enabled: boolean;
	readonly onApply: (
		target: BibleTextMarkupDragTarget
	) => void;
	readonly onRemove: (
		target: BibleTextMarkupDragTarget
	) => void;
}

/**
 * Reader-local Svelte action that connects Pointer Events and DOM hit testing
 * to the testable drag gesture controller.
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

	function onPointerUp(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}

		cancelFrame();
		flushQueuedPoints();
		gesture.pointerUp(event.pointerId);
		activePointerId = -1;
	}

	function onPointerCancel(event: PointerEvent): void {
		if (event.pointerId !== activePointerId) {
			return;
		}

		queuedPoints = [];
		cancelFrame();
		gesture.pointerCancel(event.pointerId);
		activePointerId = -1;
	}

	function onClick(event: MouseEvent): void {
		if (!gesture.consumeSuppressedClick()) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

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

function resolveTargetAtPoint(
	root: HTMLElement,
	point: PointerPoint
): BibleTextMarkupDragTarget | undefined {
	const element =
		root.ownerDocument.elementFromPoint(
			point.x,
			point.y
		);
	const wordElement =
		element?.closest<HTMLElement>(
			'[data-bible-word]'
		);

	if (
		!wordElement ||
		!root.contains(wordElement)
	) {
		return undefined;
	}

	const verseNumber = Number(
		wordElement.dataset.verse
	);
	const wordIndex = Number(
		wordElement.dataset.wordIndex
	);

	if (
		!Number.isInteger(verseNumber) ||
		!Number.isInteger(wordIndex) ||
		wordIndex < 0
	) {
		return undefined;
	}

	return {
		verseNumber,
		wordIndex
	};
}
