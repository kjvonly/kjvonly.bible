import {
	createBibleVersionId
} from '$lib/domains/bible';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	Strongs,
	StrongsContent
} from '../../models/strongs.model';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '../../persistence/strongs-store';

import {
	createStrongsId
} from '../../utils/strongs-identity';

import {
	isStrongsContent,
	type StrongsResourceData
} from './strongs-data-type-handler';

import {
	parseStrongsResourceId
} from '../strongs-resource-id';

import {
	STRONGS_DATA_TYPE,
	STRONGS_RESOURCE_TYPE
} from './strongs-resource-contract';

const STRONGS_KEY_PATTERN =
	/^[GH]\d+$/;

/**
 * Gives accepted Strong's Resource values their Domain identities.
 *
 * One definition Resource produces one object while a version bundle may
 * produce many. Semantic payload validation has already completed before this
 * factory is called.
 */
export class StrongsDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		STRONGS_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const {
			edition,
			key
		} = parseStrongsResourceId(
			resource.resourceId
		);

		const accepted =
			value as StrongsResourceData;

		if (
			key !== undefined
		) {
			if (
				!isStrongsContent(
					accepted
				)
			) {
				throw new Error(
					"Strong's single-definition Resource must contain one definition."
				);
			}

			return [
				this.createCandidate(
					resource.publisher,
					edition,
					key,
					accepted
				)
			];
		}

		if (
			isStrongsContent(
				accepted
			)
		) {
			throw new Error(
				"Strong's bundle Resource must contain a definition map."
			);
		}

		return Object.entries(
			accepted
		).map(
			([key, content]) =>
				this.createCandidate(
					resource.publisher,
					edition,
					key,
					content
				)
		);
	}

	private createCandidate(
		publisher: string,
		version: string,
		key: string,
		content: StrongsContent
	): ResourceDomainObjectCandidate {
		if (
			!STRONGS_KEY_PATTERN.test(
				key
			)
		) {
			throw new Error(
				`Invalid Strong's key: ${key}`
			);
		}

		if (
			content.number !==
				key
		) {
			throw new Error(
				`Strong's key ${key} does not match content number ${content.number}.`
			);
		}

		const bibleVersionId =
			createBibleVersionId(
				publisher,
				version
			);

		const strongsId =
			createStrongsId(
				bibleVersionId,
				key
			);

		const strongs:
			Strongs = {
				...content,
				id:
					strongsId
			};

		return {
			objectType:
				STRONGS_DEFINITION_OBJECT_TYPE,


			objectId:
				strongsId,

			dataType:
				STRONGS_DATA_TYPE,

			dataVersion:
				1,

			value:
				strongs
		};
	}
}
