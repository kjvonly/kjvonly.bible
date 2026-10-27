import type {
	BiblePericopeMap,
	BiblePericopes
} from '../../models/bible-pericopes.model';

import {
	createBiblePericopesId
} from '../../models/bible-pericopes.model';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '../../persistence/bible-pericopes-store';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	BiblePericopesResourceData
} from './bible-pericopes-data-type-handler';

import {
	BIBLE_PERICOPES_DATA_TYPE,
	BIBLE_PERICOPES_DATA_VERSION,
	BIBLE_PERICOPES_RESOURCE_TYPE,
	parseBiblePericopesResourceId
} from './bible-pericopes-resource';

import {
	BiblePericopesValidator
} from './bible-pericopes-validator';

/**
 * Gives validated Bible Pericopes Resource values their canonical Bible Domain
 * identities.
 *
 * Structural shape is accepted by the datatype handler first. This factory then
 * interprets the Resource path and applies Bible-specific invariants: Chapter
 * identity, Verse-key ownership, matching pericope refs, and canonical Bible
 * references carried by pericope words. A source bundle may therefore produce
 * many `bible/pericopes` Domain objects atomically through the generic installer.
 */
export class BiblePericopesDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_PERICOPES_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const identity =
			parseBiblePericopesResourceId(
				resource.resourceId
			);

		const accepted =
			value as BiblePericopesResourceData;

		if (
			identity.chapterRef !==
				undefined
		) {
			const source =
				identity.source;

			const chapterRef =
				identity.chapterRef;

			return [
				this.createCandidate(
					resource.publisher,
					source,
					chapterRef,
					accepted
				)
			];
		}

		{
			const source =
				identity.source;

			if (
				typeof accepted !==
					'object' ||
				accepted ===
					null ||
				Array.isArray(
					accepted
				)
			) {
				throw new Error(
					'Bible Pericopes bundle content must be an object.'
				);
			}

			return Object.entries(
				accepted
			).map(
				([chapterRef, pericopes]) =>
					this.createCandidate(
						resource.publisher,
						source,
						chapterRef,
						pericopes
					)
			);
		}

	}

	private createCandidate(
		publisher: string,
		source: string,
		chapterRef: string,
		value: unknown
	): ResourceDomainObjectCandidate {
		const validated =
			new BiblePericopesValidator()
				.validate({
					source,
					chapterRef,
					value
				});

		const id =
			createBiblePericopesId(
				publisher,
				validated.source,
				validated.chapterRef
			);

		const pericopes:
			BiblePericopes = {
				id,
				chapterRef:
					validated.chapterRef,
				pericopes:
					validated.pericopes
			};

		return {
			objectType:
				BIBLE_PERICOPES_OBJECT_TYPE,


			objectId:
				id,

			dataType:
				BIBLE_PERICOPES_DATA_TYPE,

			dataVersion:
				BIBLE_PERICOPES_DATA_VERSION,

			value:
				pericopes
		};
	}
}
