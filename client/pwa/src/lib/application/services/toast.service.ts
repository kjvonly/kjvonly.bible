export interface ToastPublisher {
	showToast(message: string): void;
}

export type ToastSubscriber =
	(message: string) => void;

/**
 * Application-owned toast message channel.
 *
 * Producers request a toast through showToast(). The root UI subscribes to
 * those messages and owns presentation concerns such as ordering and timeout.
 * Keeping those concerns separate lets non-Svelte application code publish
 * toast messages without depending on Svelte context or UI state.
 */
export class ToastService implements ToastPublisher {
	private readonly subscribers =
		new Set<ToastSubscriber>();

	showToast(message: string): void {
		for (const subscriber of this.subscribers) {
			subscriber(message);
		}
	}

	subscribeToToasts(
		subscriber: ToastSubscriber
	): () => void {
		this.subscribers.add(subscriber);

		return () => {
			this.subscribers.delete(subscriber);
		};
	}
}
