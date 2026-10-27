import type {
	BibleParagraphMap,
	BibleParagraphs
} from '../../models/bible-paragraphs.model';

import {
	createBibleParagraphsId
} from '../../models/bible-paragraphs.model';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '../../persistence/bible-paragraphs-store';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	BibleParagraphsResourceData
} from './bible-paragraphs-data-type-handler';

import {
	BIBLE_PARAGRAPHS_DATA_TYPE,
	BIBLE_PARAGRAPHS_DATA_VERSION,
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	parseBibleParagraphsResourceId
} from './bible-paragraphs-resource';

import {
	BibleParagraphsValidator
} from './bible-paragraphs-validator';

/**
 * Gives validated Bible Paragraphs Resource values their canonical Bible
 * Domain identities.
 *
 * The datatype handler owns structural payload validation. This factory owns
 * Resource-path interpretation and Chapter-specific invariants, including the
 * rule that every paragraph marker belongs to the Chapter being installed.
 * One bundle Resource may therefore produce many `bible/paragraphs` objects.
 */
export class BibleParagraphsDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_PARAGRAPHS_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const identity =
			parseBibleParagraphsResourceId(
				resource.resourceId
			);

		const accepted =
			value as BibleParagraphsResourceData;

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
				accepted ===
					null ||
				typeof accepted !==
					'object' ||
				Array.isArray(
					accepted
				)
			) {
				throw new Error(
					'Bible Paragraphs bundle content must be an object.'
				);
			}

			return Object.entries(
				accepted
			).map(
				([chapterRef, paragraphs]) =>
					this.createCandidate(
						resource.publisher,
						source,
						chapterRef,
						paragraphs
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
			new BibleParagraphsValidator()
				.validate({
					source,
					chapterRef,
					value
				});

		const id =
			createBibleParagraphsId(
				publisher,
				validated.source,
				validated.chapterRef
			);

		const paragraphs:
			BibleParagraphs = {
				id,
				chapterRef:
					validated.chapterRef,
				paragraphs:
					validated.paragraphs
			};

		return {
			objectType:
				BIBLE_PARAGRAPHS_OBJECT_TYPE,


			objectId:
				id,

			dataType:
				BIBLE_PARAGRAPHS_DATA_TYPE,

			dataVersion:
				BIBLE_PARAGRAPHS_DATA_VERSION,

			value:
				paragraphs
		};
	}
}
