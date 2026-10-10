import type {
	NormalizedContentAddress
} from '../../../models/normalized-content-address.model';
import {
	resolveNormalizedContentDomAddress
} from '../../../ui/addressing/normalized-content-dom-address';
import {
	NormalizedContentTextMarkupDragGesture,
	type PointerPoint
} from './normalized-content-text-markup-drag-gesture';

export interface NormalizedContentTextMarkupDragParameters {
	readonly enabled: boolean;
	readonly onApply: (
		target: NormalizedContentAddress
	) => void;
	readonly onRemove: (
		target: NormalizedContentAddress
	) => void;
}

/**
 * Reader-local Svelte action connecting Pointer Events and coordinate hit
 * testing to canonical Normalized Content Text Markup addresses.
 *
 * @param node Reader-owned rendered document interaction surface.
 * @param initialParameters Initial enabled state and markup mutation callbacks.
 */
export function normalizedContentTextMarkupDrag(
	node: HTMLElement,
	initialParameters: NormalizedContentTextMarkupDragParameters
) {
	let parameters = initialParameters;
	let frameID: number | undefined;
	let queuedPoints: PointerPoint[] = [];
	let activePointerId = -1;
	const view = node.ownerDocument.defaultView;

	const gesture =
		new NormalizedContentTextMarkupDragGesture({
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
					// Pointer capture is optional; hit testing remains coordinate-based.
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
		update(
			nextParameters: NormalizedContentTextMarkupDragParameters
		) {
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
 * Resolves one pointer position to an eligible canonical normalized word.
 *
 * @param root Rendered document interaction surface that scopes hit testing.
 * @param point Current viewport pointer coordinates.
 */
function resolveTargetAtPoint(
	root: HTMLElement,
	point: PointerPoint
): NormalizedContentAddress | undefined {
	const element =
		root.ownerDocument.elementFromPoint(
			point.x,
			point.y
		);
	const wordElement =
		element?.closest<HTMLElement>(
			'[data-normalized-content-kind="word"]'
		);

	if (
		!wordElement ||
		!root.contains(wordElement)
	) {
		return undefined;
	}

	return resolveNormalizedContentDomAddress(
		root,
		wordElement
	);
}
