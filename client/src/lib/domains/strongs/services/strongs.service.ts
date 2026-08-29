import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import type {
	StrongsStore
} from '$lib/domains/strongs/persistence/strongs-store';

import type {
	ResourceLoader
} from '$lib/resource/loading/resource-loader';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	STRONGS_RESOURCE_TYPE
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

export class StrongsService {

	constructor(
		private readonly strongs:
			Pick<
				StrongsStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>
	) {}

	async get(
		source:
			PublishedResourceReference,
		key:
			string
	): Promise<Strongs> {

		const {
			edition
		} =
			parseStrongsSource(
				source
			);

		const strongsId =
			createStrongsId(
				`${source.publisher}/${edition}`,
				key
			);

		const existing =
			await this.strongs.get(
				strongsId
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		const found =
			await this.resourceLoader.load(
				source,
				key
			);

		if (!found) {
			throw new Error(
				`Strong's Resource not found: ${source.publisher}/${source.resourceId}/${key}`
			);
		}

		const installed =
			await this.strongs.get(
				strongsId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Strong's definition was not installed: ${strongsId}`
			);
		}

		return installed;
	}
}

function parseStrongsSource(
	source:
		PublishedResourceReference
): {
	readonly edition:
		string;
} {

	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		STRONGS_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Strong's Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Strong's Resource source: ${source.resourceId}`
		);
	}

	return {
		edition:
			identifier.path[0]
	};
}