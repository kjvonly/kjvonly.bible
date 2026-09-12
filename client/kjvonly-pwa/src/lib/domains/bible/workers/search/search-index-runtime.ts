import FlexSearch, {
	type Id
} from 'flexsearch';

import type {
	BibleSearchIndex,
	BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

export class SearchIndexRuntime {
	private readonly indexes =
		new Map<
			string,
			FlexSearch.Index
		>();

	private readonly initializing =
		new Map<
			string,
			Promise<void>
		>();

	initialize(
		searchIndex:
			BibleSearchIndex
	): Promise<void> {
		if (
			this.indexes.has(
				searchIndex.id
			)
		) {
			return Promise.resolve();
		}

		const existing =
			this.initializing.get(
				searchIndex.id
			);

		if (existing) {
			return existing;
		}

		const promise =
			this.importIndex(
				searchIndex
			);

		this.initializing.set(
			searchIndex.id,
			promise
		);

		void promise.finally(
			() => {
				if (
					this.initializing.get(
						searchIndex.id
					) === promise
				) {
					this.initializing.delete(
						searchIndex.id
					);
				}
			}
		);

		return promise;
	}

	async search(
		searchIndexId:
			string,
		text:
			string
	): Promise<string[]> {
		const index =
			await this.getIndex(
				searchIndexId
			);

		const matches:
			FlexSearch.IndexSearchResult =
				[];

		for (
			const term of
				text.split('OR')
		) {
			matches.push(
				...await index.searchAsync(
					term,
					1000000
				)
			);
		}

		return matches
			.filter(
				onlyUnique
			)
			.map(
				(value: FlexSearch.Id) =>
					value as string
			)
			.sort(
				compareBibleLocationIds
			);
	}

	async export(
		searchIndexId:
			string
	): Promise<BibleSearchIndexChunks> {
		const index =
			await this.getIndex(
				searchIndexId
			);

		const chunks:
			Record<string, string> =
				{};

		await index.export(
			(
				key: string,
				data: string | undefined
			) => {
				chunks[key] =
					data ?? '';
			}
		);

		return chunks as
			BibleSearchIndexChunks;
	}

	private async getIndex(
		searchIndexId:
			string
	): Promise<FlexSearch.Index> {
		await this.initializing.get(
			searchIndexId
		);

		const index =
			this.indexes.get(
				searchIndexId
			);

		if (!index) {
			throw new Error(
				`Search Index not initialized: ${searchIndexId}`
			);
		}

		return index;
	}

	private async importIndex(
		searchIndex:
			BibleSearchIndex
	): Promise<void> {
		const index =
			new FlexSearch.Index();

		for (
			const [
				key,
				data
			] of Object.entries(
				searchIndex.chunks
			)
		) {
			await index.import(
				key,
				data
			);
		}

		this.indexes.set(
			searchIndex.id,
			index
		);
	}
}

function onlyUnique(
	value: Id,
	index: number,
	array: Id[]
): boolean {
	return array.indexOf(
		value
	) === index;
}

function compareBibleLocationIds(
	a: string,
	b: string
): number {
	return toSortableBibleLocationId(a) -
		toSortableBibleLocationId(b);
}

function toSortableBibleLocationId(
	value: string
): number {
	const [
		bookId,
		chapter,
		verse
	] = value
		.split('_')
		.map(
			(part) =>
				Number.parseInt(
					part,
					10
				)
		);

	return (
		bookId * 1000000 +
		chapter * 1000 +
		verse
	);
}
