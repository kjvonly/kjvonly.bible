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
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	createBibleBooknamesId
} from '$lib/domains/bible/models/bible-booknames.model';

import type {
	BibleBooknamesStore
} from '$lib/domains/bible/persistence/bible-booknames-store';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

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
	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Booknames Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Booknames Resource source: ${source.resourceId}`
		);
	}

	return {
		key:
			identifier.path[0]
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
