import type { Modules } from '$lib/application/models/modules.model';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
import type { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';
import { findPane } from '$lib/application/runtime/workspace/workspace-pane-tree';
import {
	restorePane,
	serializePane
} from '$lib/application/runtime/pane/persistence/pane-persistence';

const PANE_STORAGE_KEY = 'pane';

export class PaneService {
	private static _instance: PaneService;
	rootPane: Pane | any = {
		id: 'a',
		split: undefined,
		left: undefined,
		right: undefined,
		buffer: undefined
	};

	heightWidth: any = {};

	findNode(n: Pane, key: string): Pane | undefined {
		return findPane(
			n,
			key
		);
	}

	save(): void {
		localStorage.setItem(
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
			localStorage.getItem(
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

	onDeletePane: (paneID: string) => void = (): void => {};
	onSplitPane: (
		paneID: string,
		split: PaneSplit,
		module: Modules,
		data: any
	) => void = () => {};

	subscribers: any = [];

	subscribe(id: string, fn: Function) {
		this.subscribers.push({ id: id, fn: fn });
	}

	unsubscribe(id: string) {
		this.subscribers = this.subscribers.filter((s: any) => {
			if (s.id !== id) {
				return s;
			}
		});
	}

	publishHw(hw: any) {
		this.subscribers.forEach((s: any) => {
			s.fn(hw);
		});
	}

	private constructor() {}

	public static get Instance() {
		// Do you need arguments? Make it a regular static method instead.
		return this._instance || (this._instance = new this());
	}
}
export let paneService = PaneService.Instance;
