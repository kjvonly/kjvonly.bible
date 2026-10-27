import type {
	BibleTextMarkup
} from '../../models/bible-text-markup.model';

import {
	createBibleTextMarkupId
} from '../../models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '../../persistence/bible-text-markup-store';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	BibleTextMarkupResourceData
} from './bible-text-markup-data-type-handler';

import {
	BIBLE_TEXT_MARKUP_DATA_TYPE,
	BIBLE_TEXT_MARKUP_DATA_VERSION,
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	parseBibleTextMarkupResourceId
} from './bible-text-markup-resource';

import {
	BibleTextMarkupValidator
} from './bible-text-markup-validator';

/**
 * Gives validated Bible Text Markup Resource values their canonical Bible
 * Domain identities.
 *
 * The datatype handler owns payload shape. This factory owns Resource-path
 * interpretation and Bible-specific invariants such as canonical Chapter,
 * Verse, and word-index references. A named bundle may therefore produce many
 * `bible/text-markup` Domain objects through one generic installation.
 */
export class BibleTextMarkupDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_TEXT_MARKUP_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const identity =
			parseBibleTextMarkupResourceId(
				resource.resourceId
			);

		const accepted =
			value as BibleTextMarkupResourceData;

		if (
			identity.chapterRef !==
				undefined
		) {
			const name =
				identity.name;

			const chapterRef =
				identity.chapterRef;

			return [
				this.createCandidate(
					resource.publisher,
					name,
					chapterRef,
					accepted
				)
			];
		}

		{
			const name =
				identity.name;

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
					'Bible Text Markup bundle content must be an object.'
				);
			}

			return Object.entries(
				accepted
			).map(
				([chapterRef, markings]) =>
					this.createCandidate(
						resource.publisher,
						name,
						chapterRef,
						markings
					)
			);
		}

	}

	private createCandidate(
		publisher: string,
		name: string,
		chapterRef: string,
		value: unknown
	): ResourceDomainObjectCandidate {
		const validated =
			new BibleTextMarkupValidator()
				.validate({
					name,
					chapterRef,
					value
				});

		const id =
			createBibleTextMarkupId(
				publisher,
				validated.name,
				validated.chapterRef
			);

		const textMarkup:
			BibleTextMarkup = {
				id,
				chapterRef:
					validated.chapterRef,
				markings:
					validated.markings
			};

		return {
			objectType:
				BIBLE_TEXT_MARKUP_OBJECT_TYPE,


			objectId:
				id,

			dataType:
				BIBLE_TEXT_MARKUP_DATA_TYPE,

			dataVersion:
				BIBLE_TEXT_MARKUP_DATA_VERSION,

			value:
				textMarkup
		};
	}
}
