/**
 * Schedules an operation after a period of inactivity.
 *
 * Scheduling again before the delay expires cancels the previous operation and
 * restarts the delay. Consumers should cancel the service when their lifecycle
 * ends so pending work cannot fire after the consumer is gone.
 */
export class DebounceService {
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly delayMilliseconds: number) {}

	/**
	 * Replace any pending operation and restart the debounce delay.
	 */
	schedule(operation: () => void): void {
		this.cancel();

		this.timer = setTimeout(
			() => {
				this.timer = undefined;
				operation();
			},
			this.delayMilliseconds
		);
	}

	/**
	 * Cancel the currently pending operation, if one exists.
	 */
	cancel(): void {
		if (this.timer === undefined) {
			return;
		}

		clearTimeout(this.timer);
		this.timer = undefined;
	}
}
