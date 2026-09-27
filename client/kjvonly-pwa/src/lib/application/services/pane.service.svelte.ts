import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
import {
	restorePane,
	serializePane
} from '$lib/application/runtime/pane/persistence/pane-persistence';
import type { WorkspacePaneDimensionsByID } from '$lib/application/runtime/workspace/workspace-layout';

const PANE_STORAGE_KEY = 'pane';

type PaneDimensionsSubscriber = (
	paneDimensionsByID: WorkspacePaneDimensionsByID
) => void;

export class PaneService {
	rootPane: Pane = {
		id: 'a',
		split: undefined,
		left: undefined,
		right: undefined,
		state: undefined
	};

	/**
	 * Latest normalized dimensions for every active Pane, keyed by Pane ID.
	 *
	 * This is a shared map, not the dimensions for one Pane. Each Pane
	 * subscriber receives the full map and reads its own entry by stable Pane ID.
	 * Values are workspace-relative fractions, so `{ height: 0.5, width: 0.5 }`
	 * means the Pane occupies half of the workspace in each dimension.
	 */
	paneDimensionsByID: WorkspacePaneDimensionsByID = {};

	save(): void {
		this.storage.setItem(
			PANE_STORAGE_KEY,
			JSON.stringify(
				serializePane(
					this.rootPane
				)
			)
		);
	}

	restore(): boolean {
		const serialized =
			this.storage.getItem(
				PANE_STORAGE_KEY
			);

		if (serialized === null) {
			return false;
		}

		this.rootPane =
			restorePane(
				JSON.parse(
					serialized
				)
			);

		return true;
	}

	private paneDimensionSubscribers: Array<{
		id: string;
		fn: PaneDimensionsSubscriber;
	}> = [];

	/**
	 * Subscribes a Pane to shared Pane-dimension publications.
	 *
	 * The callback receives dimensions for every active Pane. The subscriber
	 * selects its own dimensions using the Pane ID it already owns.
	 */
	subscribeToPaneDimensions(
		id: string,
		fn: PaneDimensionsSubscriber
	): void {
		this.paneDimensionSubscribers.push({ id, fn });
	}

	unsubscribeFromPaneDimensions(id: string): void {
		this.paneDimensionSubscribers =
			this.paneDimensionSubscribers.filter(
				(subscriber) => subscriber.id !== id
			);
	}

	/**
	 * Publishes the complete Pane-dimensions map to every Pane subscriber.
	 *
	 * We intentionally publish one shared map instead of a separate event per
	 * Pane. Each subscriber reads `paneDimensionsByID[paneID]` for its own size.
	 */
	publishPaneDimensions(
		paneDimensionsByID: WorkspacePaneDimensionsByID
	): void {
		this.paneDimensionSubscribers.forEach(
			(subscriber) => {
				subscriber.fn(
					paneDimensionsByID
				);
			}
		);
	}

	constructor(
		private readonly storage: Pick<Storage, 'getItem' | 'setItem'>
	) {}
}
