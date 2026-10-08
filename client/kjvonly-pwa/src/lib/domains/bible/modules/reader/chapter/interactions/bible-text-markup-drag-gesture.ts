export interface BibleTextMarkupDragTarget {
	readonly verseNumber: number;
	readonly wordIndex: number;
}

export interface PointerPoint {
	readonly x: number;
	readonly y: number;
}

interface DragGestureCallbacks {
	readonly resolveTarget: (
		point: PointerPoint
	) => BibleTextMarkupDragTarget | undefined;
	readonly onApply: (
		target: BibleTextMarkupDragTarget
	) => void;
	readonly onRemove: (
		target: BibleTextMarkupDragTarget
	) => void;
	readonly onDragStart: (
		pointerId: number
	) => void;
	readonly onDragEnd: (
		pointerId: number
	) => void;
}

const GESTURE_THRESHOLD_PX = 10;
const INTERPOLATION_DISTANCE_PX = 8;
const MAX_INTERPOLATION_STEPS = 48;

/**
 * Owns the transient pointer state for one horizontal Text Markup stroke.
 *
 * The controller is DOM-independent so gesture semantics can be unit tested.
 */
export class BibleTextMarkupDragGesture {
	private enabled = false;
	private pointerId: number | undefined;
	private startPoint: PointerPoint | undefined;
	private lastPoint: PointerPoint | undefined;
	private operation: 'apply' | 'remove' | undefined;
	private readonly visitedTargets = new Set<string>();
	private suppressClick = false;

	constructor(
		private readonly callbacks: DragGestureCallbacks
	) {}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;

		if (!enabled) {
			this.cancel();
		}
	}

	pointerDown(
		pointerId: number,
		point: PointerPoint,
		isPrimary: boolean,
		button: number
	): boolean {
		if (
			!this.enabled ||
			this.pointerId !== undefined ||
			!isPrimary ||
			button !== 0
		) {
			return false;
		}

		const target =
			this.callbacks.resolveTarget(point);

		if (!target || target.wordIndex < 0) {
			return false;
		}

		this.suppressClick = false;
		this.pointerId = pointerId;
		this.startPoint = point;
		this.lastPoint = point;
		this.operation = undefined;
		this.visitedTargets.clear();
		return true;
	}

	pointerMove(
		pointerId: number,
		point: PointerPoint
	): void {
		if (
			pointerId !== this.pointerId ||
			!this.startPoint ||
			!this.lastPoint
		) {
			return;
		}

		if (!this.operation) {
			const deltaX = point.x - this.startPoint.x;
			const deltaY = point.y - this.startPoint.y;
			const horizontalDistance = Math.abs(deltaX);
			const verticalDistance = Math.abs(deltaY);

			if (
				horizontalDistance < GESTURE_THRESHOLD_PX &&
				verticalDistance < GESTURE_THRESHOLD_PX
			) {
				return;
			}

			if (verticalDistance >= horizontalDistance) {
				this.cancel();
				return;
			}

			this.operation =
				deltaX > 0 ? 'apply' : 'remove';
			this.suppressClick = true;
			this.callbacks.onDragStart(pointerId);
		}

		this.processSegment(
			this.lastPoint,
			point
		);
		this.lastPoint = point;
	}

	pointerUp(pointerId: number): void {
		if (pointerId !== this.pointerId) {
			return;
		}

		this.finish();
	}

	pointerCancel(pointerId: number): void {
		if (pointerId !== this.pointerId) {
			return;
		}

		this.suppressClick = false;
		this.finish();
	}

	consumeSuppressedClick(): boolean {
		if (!this.suppressClick) {
			return false;
		}

		this.suppressClick = false;
		return true;
	}

	isDragging(): boolean {
		return this.operation !== undefined;
	}

	isTracking(): boolean {
		return this.pointerId !== undefined;
	}

	cancel(): void {
		if (
			this.pointerId !== undefined &&
			this.operation
		) {
			this.callbacks.onDragEnd(
				this.pointerId
			);
		}

		this.pointerId = undefined;
		this.startPoint = undefined;
		this.lastPoint = undefined;
		this.operation = undefined;
		this.visitedTargets.clear();
	}

	private finish(): void {
		if (
			this.pointerId !== undefined &&
			this.operation
		) {
			this.callbacks.onDragEnd(
				this.pointerId
			);
		}

		this.pointerId = undefined;
		this.startPoint = undefined;
		this.lastPoint = undefined;
		this.operation = undefined;
		this.visitedTargets.clear();
	}

	private processSegment(
		from: PointerPoint,
		to: PointerPoint
	): void {
		if (!this.operation) {
			return;
		}

		const distance = Math.hypot(
			to.x - from.x,
			to.y - from.y
		);
		const steps = Math.min(
			MAX_INTERPOLATION_STEPS,
			Math.max(
				1,
				Math.ceil(
					distance /
						INTERPOLATION_DISTANCE_PX
				)
			)
		);

		for (
			let step = 0;
			step <= steps;
			step += 1
		) {
			const ratio = step / steps;
			this.processPoint({
				x: from.x + (to.x - from.x) * ratio,
				y: from.y + (to.y - from.y) * ratio
			});
		}
	}

	private processPoint(point: PointerPoint): void {
		const target =
			this.callbacks.resolveTarget(point);

		if (!target || target.wordIndex < 0) {
			return;
		}

		const key =
			`${target.verseNumber}:${target.wordIndex}`;

		if (this.visitedTargets.has(key)) {
			return;
		}

		this.visitedTargets.add(key);

		if (this.operation === 'apply') {
			this.callbacks.onApply(target);
			return;
		}

		this.callbacks.onRemove(target);
	}
}
