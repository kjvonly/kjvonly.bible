import {
	type PublishedResourceReference,
	type ResourceLoader
} from '$lib/resource';

import type {
	Strongs
} from '../models/strongs.model';

import type {
	StrongsStore
} from '../persistence/strongs-store';


import {
	createStrongsId
} from '../utils/strongs-identity';

import {
	parseStrongsResourceId
} from '../resources/strongs-resource-id';

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
	const {
		edition,
		key
	} = parseStrongsResourceId(
		source.resourceId
	);

	if (
		key !== undefined
	) {
		throw new Error(
			`Invalid Strong's Resource source: ${source.resourceId}`
		);
	}

	return {
		edition
	};
}
