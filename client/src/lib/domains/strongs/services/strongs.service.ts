import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import type {
	StrongsStore
} from '$lib/domains/strongs/persistence/strongs-store';

import type {
	StrongsResourceLoader
} from '$lib/domains/strongs/resources/definitions/strongs-resource-loader';

import {
	createBibleVersionId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

export class StrongsService {

	constructor(
		private readonly publisher:
			string,

		private readonly strongs:
			Pick<
				StrongsStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				StrongsResourceLoader,
				'load'
			>
	) {}

	async get(
		version: string,
		key: string
	): Promise<Strongs> {

		const bibleVersionId =
			createBibleVersionId(
				this.publisher,
				version
			);

		const strongsId =
			createStrongsId(
				bibleVersionId,
				key
			);

		const existing =
			await this.strongs.get(
				strongsId
			);

		if (existing) {
			return existing;
		}

		const found =
			await this.resourceLoader.load(
				this.publisher,
				version,
				key
			);

		if (!found) {
			throw new Error(
				`Strong's Resource not found: ${this.publisher}/${version}/${key}`
			);
		}

		const installed =
			await this.strongs.get(
				strongsId
			);

		if (!installed) {
			throw new Error(
				`Strong's definition was not installed: ${strongsId}`
			);
		}

		return installed;
	}
}