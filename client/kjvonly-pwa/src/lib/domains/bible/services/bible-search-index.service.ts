import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	createBibleSearchIndexId
} from '$lib/domains/bible/models/bible-search-index.model';

import type {
	BibleSearchIndexStore
} from '$lib/domains/bible/persistence/bible-search-index-store';

import {
	BIBLE_SEARCH_RESOURCE_TYPE
} from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

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
	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_SEARCH_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Search Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Search Resource source: ${source.resourceId}`
		);
	}

	return {
		version:
			identifier.path[0]
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
