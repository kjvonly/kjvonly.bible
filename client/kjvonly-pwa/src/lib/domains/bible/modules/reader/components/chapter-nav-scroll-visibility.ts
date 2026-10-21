/**
 * Tracks scroll-direction visibility for the Bible Reader's floating chapter
 * controls. Matches the Normalized Content Reader's navigation behavior:
 * controls remain visible at the top/bottom, hide while scrolling down, and
 * reappear while scrolling up after a small movement threshold.
 */
export class ChapterNavScrollVisibility {
	private static readonly BOTTOM_THRESHOLD = 40;
	private static readonly DIRECTION_THRESHOLD = 4;

	private previousScrollTop = 0;
	private accumulatedDelta = 0;
	private visible = true;

	/** Starts tracking from the current position, showing the controls again. */
	reset(scrollTop = 0): void {
		this.previousScrollTop = Math.max(0, scrollTop);
		this.accumulatedDelta = 0;
		this.visible = true;
	}

	/** Returns whether the controls should be visible after this scroll sample. */
	update({
		scrollTop,
		scrollHeight,
		clientHeight
	}: {
		scrollTop: number;
		scrollHeight: number;
		clientHeight: number;
	}): boolean {
		const top = Math.max(0, scrollTop);
		const delta = top - this.previousScrollTop;
		this.previousScrollTop = top;
		const remaining = scrollHeight - clientHeight - top;

		if (top <= 0 || remaining <= ChapterNavScrollVisibility.BOTTOM_THRESHOLD) {
			this.visible = true;
			this.accumulatedDelta = 0;
			return this.visible;
		}

		if (delta === 0) {
			return this.visible;
		}

		if (Math.sign(delta) !== Math.sign(this.accumulatedDelta)) {
			this.accumulatedDelta = 0;
		}
		this.accumulatedDelta += delta;
		if (Math.abs(this.accumulatedDelta) >= ChapterNavScrollVisibility.DIRECTION_THRESHOLD) {
			this.visible = this.accumulatedDelta < 0;
			this.accumulatedDelta = 0;
		}

		return this.visible;
	}
}
