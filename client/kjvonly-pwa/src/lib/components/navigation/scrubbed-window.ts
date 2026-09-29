/**
 * One rendered item inside a scrubbed window.
 *
 * `value` is the stable one-based scrubber value for the item, independent of
 * where the item currently sits inside the bounded rendered window.
 */
export interface ScrubbedWindowEntry<T> {
	value: number;
	item: T;
}

export interface ScrubbedWindowOptions<T> {
	/** Number of source items requested when extending either edge. */
	batchSize?: number;
	/** Maximum number of rendered items retained after append/prepend. */
	maxItems?: number;
	/** Number of source items rendered around a distant scrubber jump. */
	jumpItems?: number;
	/** Loads the zero-based source item at `index`. */
	loadItem: (index: number) => Promise<T | undefined>;
	/** Publishes the current rendered window to the owning UI. */
	onChange: (entries: readonly ScrubbedWindowEntry<T>[]) => void;
}

type InternalEntry<T> = ScrubbedWindowEntry<T> & {
	index: number;
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_ITEMS = 40;
const DEFAULT_JUMP_ITEMS = 20;

/**
 * Generic bounded, bidirectional data window for `KJVScrubbedViewport`.
 *
 * The controller knows nothing about DOM layout. It owns only the reusable
 * collection behavior needed by large scrubbed lists:
 *
 * - load an initial batch
 * - append at the end and trim the front
 * - prepend at the front and trim the end
 * - replace the window around a distant absolute scrubber value
 * - discard stale asynchronous work after `reset()`
 *
 * The owning view supplies only an absolute item loader and renders the entries
 * emitted through `onChange`.
 */
export class ScrubbedWindow<T> {
	private readonly batchSize: number;
	private readonly maxItems: number;
	private readonly jumpItems: number;
	private readonly loadItem: (index: number) => Promise<T | undefined>;
	private readonly onChange: (
		entries: readonly ScrubbedWindowEntry<T>[]
	) => void;

	private entries: InternalEntry<T>[] = [];
	private totalItems = 0;
	private startIndex = 0;
	private endIndex = 0;
	private generation = 0;
	private loadingGeneration: number | undefined;

	constructor(options: ScrubbedWindowOptions<T>) {
		this.batchSize = Math.max(
			1,
			options.batchSize ?? DEFAULT_BATCH_SIZE
		);
		this.maxItems = Math.max(
			this.batchSize,
			options.maxItems ?? DEFAULT_MAX_ITEMS
		);
		this.jumpItems = Math.max(
			1,
			options.jumpItems ?? DEFAULT_JUMP_ITEMS
		);
		this.loadItem = options.loadItem;
		this.onChange = options.onChange;
	}

	/**
	 * Clears the old collection, invalidates pending work, and renders the first
	 * batch of a new source collection.
	 */
	async reset(totalItems: number): Promise<void> {
		this.generation += 1;
		this.totalItems = Math.max(0, Math.floor(totalItems));
		this.entries = [];
		this.startIndex = 0;
		this.endIndex = 0;
		this.publish();

		if (this.totalItems === 0) {
			return;
		}

		await this.replaceRange(
			0,
			Math.min(this.batchSize, this.totalItems),
			this.generation
		);
	}

	/**
	 * Pushes one batch onto the rendered end. If the window grows beyond
	 * `maxItems`, the oldest rendered items are removed from the front.
	 */
	async append(): Promise<void> {
		if (this.endIndex >= this.totalItems) {
			return;
		}

		const generation = this.generation;
		const startIndex = this.endIndex;
		const endIndex = Math.min(
			startIndex + this.batchSize,
			this.totalItems
		);
		const loaded = await this.loadRange(
			startIndex,
			endIndex,
			generation
		);

		if (!loaded || generation !== this.generation) {
			return;
		}

		this.entries = [
			...this.entries,
			...loaded
		].slice(-this.maxItems);
		this.endIndex = endIndex;
		this.startIndex =
			this.entries[0]?.index ?? this.endIndex;
		this.publish();
	}

	/**
	 * Pushes one batch onto the rendered front. If the window grows beyond
	 * `maxItems`, the newest rendered items are removed from the end.
	 */
	async prepend(): Promise<void> {
		if (this.startIndex <= 0) {
			return;
		}

		const generation = this.generation;
		const endIndex = this.startIndex;
		const startIndex = Math.max(
			0,
			endIndex - this.batchSize
		);
		const loaded = await this.loadRange(
			startIndex,
			endIndex,
			generation
		);

		if (!loaded || generation !== this.generation) {
			return;
		}

		this.entries = [
			...loaded,
			...this.entries
		].slice(0, this.maxItems);
		this.startIndex = startIndex;
		this.endIndex =
			(this.entries[this.entries.length - 1]?.index ?? startIndex) + 1;
		this.publish();
	}

	/**
	 * Makes a one-based absolute scrubber value renderable. Existing values are
	 * left untouched; distant values replace the bounded window with context on
	 * both sides of the target.
	 */
	async prepareValue(
		requestedValue: number
	): Promise<number | undefined> {
		if (this.totalItems === 0) {
			return;
		}

		const targetValue = Math.min(
			Math.max(1, Math.floor(requestedValue)),
			this.totalItems
		);

		if (
			this.entries.some(
				(entry) => entry.value === targetValue
			)
		) {
			return targetValue;
		}

		const targetIndex = targetValue - 1;
		let startIndex = Math.max(
			0,
			targetIndex - Math.floor(this.jumpItems / 2)
		);
		let endIndex = Math.min(
			this.totalItems,
			startIndex + this.jumpItems
		);

		if (endIndex - startIndex < this.jumpItems) {
			startIndex = Math.max(
				0,
				endIndex - this.jumpItems
			);
		}

		await this.replaceRange(
			startIndex,
			endIndex,
			this.generation
		);

		return this.entries.find(
			(entry) => entry.value >= targetValue
		)?.value ??
			this.entries[this.entries.length - 1]?.value;
	}

	private async replaceRange(
		startIndex: number,
		endIndex: number,
		generation: number
	): Promise<void> {
		const loaded = await this.loadRange(
			startIndex,
			endIndex,
			generation
		);

		if (!loaded || generation !== this.generation) {
			return;
		}

		this.entries = loaded;
		this.startIndex = startIndex;
		this.endIndex = endIndex;
		this.publish();
	}

	private async loadRange(
		startIndex: number,
		endIndex: number,
		generation: number
	): Promise<InternalEntry<T>[] | undefined> {
		if (this.loadingGeneration === generation) {
			return;
		}

		this.loadingGeneration = generation;

		try {
			const loaded: InternalEntry<T>[] = [];

			for (
				let index = startIndex;
				index < endIndex;
				index++
			) {
				const item = await this.loadItem(index);

				if (generation !== this.generation) {
					return;
				}

				if (item === undefined) {
					continue;
				}

				loaded.push({
					index,
					value: index + 1,
					item
				});
			}

			return loaded;
		} finally {
			if (this.loadingGeneration === generation) {
				this.loadingGeneration = undefined;
			}
		}
	}

	private publish(): void {
		this.onChange(
			this.entries.map(({ value, item }) => ({
				value,
				item
			}))
		);
	}
}
