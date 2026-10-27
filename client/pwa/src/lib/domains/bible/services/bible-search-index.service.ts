import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	ResourceInstallResult
} from '$lib/resource';


import type {
	BibleSearchIndex
} from '../models/bible-search-index.model';

import {
	createBibleSearchIndexId
} from '../models/bible-search-index.model';

import type {
	BibleSearchIndexStore
} from '../persistence/bible-search-index-store';

import {
	parseBibleSearchIndexResourceId
} from '../resources/search/bible-search-index-resource';

interface ResourceInstaller {
	install(
		reference:
			PublishedResourceReference
	): Promise<ResourceInstallResult>;
}

export class BibleSearchIndexService {

	constructor(
		private readonly searchIndexes:
			Pick<
				BibleSearchIndexStore,
				'get'
			>,

		private readonly resources:
			ResourceInstaller
	) {}

	async get(
		source:
			PublishedResourceReference
	): Promise<BibleSearchIndex> {
		const {
			version
		} =
			parseBibleSearchSource(
				source
			);

		const searchIndexId =
			createBibleSearchIndexId(
				source.publisher,
				version
			);

		const existing =
			await this.searchIndexes.get(
				searchIndexId
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

		if (
			!result.found
		) {
			throw new Error(
				`Bible Search Index Resource not found: ${source.publisher}/${source.resourceId}`
			);
		}

		assertBibleSearchInstallSucceeded(
			result
		);

		const installed =
			await this.searchIndexes.get(
				searchIndexId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Search Index was not installed: ${searchIndexId}`
			);
		}

		return installed;
	}
}

function parseBibleSearchSource(
	source:
		PublishedResourceReference
): {
	readonly version:
		string;
} {
	return {
		version:
			parseBibleSearchIndexResourceId(
				source.resourceId
			)
	};
}

function assertBibleSearchInstallSucceeded(
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
			`Unsupported Bible Search Resource: ${outcome.resourceType}`
		);
	}
}
