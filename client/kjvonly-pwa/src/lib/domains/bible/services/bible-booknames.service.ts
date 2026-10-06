import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	ResourceInstallResult
} from '$lib/resource';


import type {
	BibleBooknames
} from '../models/bible-booknames.model';

import {
	createBibleBooknamesId
} from '../models/bible-booknames.model';

import type {
	BibleBooknamesStore
} from '../persistence/bible-booknames-store';

import {
	parseBibleBooknamesResourceId
} from '../resources/booknames/bible-booknames-resource';

interface ResourceInstaller {
	install(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult>;
}

export class BibleBooknamesService {

	private readonly cache =
		new Map<
			string,
			Promise<BibleBooknames>
		>();

	constructor(
		private readonly booknames:
			Pick<
				BibleBooknamesStore,
				'get'
			>,

		private readonly resources:
			ResourceInstaller
	) {}

	refresh(): void {
		this.cache.clear();
	}

	async get(
		source:
			PublishedResourceReference
	): Promise<BibleBooknames> {
		const {
			key
		} =
			parseBibleBooknamesSource(
				source
			);

		const booknamesId =
			createBibleBooknamesId(
				source.publisher,
				key
			);

		const cached =
			this.cache.get(
				booknamesId
			);

		if (cached) {
			return cached;
		}

		const loading =
			this.load(
				source,
				booknamesId
			).catch(
				(error) => {
					this.cache.delete(
						booknamesId
					);

					throw error;
				}
			);

		this.cache.set(
			booknamesId,
			loading
		);

		return loading;
	}

	private async load(
		source:
			PublishedResourceReference,
		booknamesId:
			string
	): Promise<BibleBooknames> {
		const existing =
			await this.booknames.get(
				booknamesId
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		const result =
			await this.resources.install(
				source
			);

		if (!result.found) {
			throw new Error(
				`Bible Booknames Resource not found: ${source.publisher}/${source.resourceId}`
			);
		}

		assertBibleBooknamesInstallSucceeded(
			result
		);

		const installed =
			await this.booknames.get(
				booknamesId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Booknames were not installed: ${booknamesId}`
			);
		}

		return installed;
	}
}

function parseBibleBooknamesSource(
	source:
		PublishedResourceReference
): {
	readonly key:
		string;
} {
	return {
		key:
			parseBibleBooknamesResourceId(
				source.resourceId
			)
	};
}

function assertBibleBooknamesInstallSucceeded(
	result:
		ResourceInstallResult
): void {
	for (
		const outcome of
			result.resources
	) {
		if (
			outcome.status ===
			'handled' ||
			outcome.status ===
			'current'
		) {
			continue;
		}

		if (
			outcome.status ===
			'failed'
		) {
			throw outcome.error;
		}

		throw new Error(
			`Unsupported Bible Booknames Resource: ${outcome.resourceType}`
		);
	}
}
