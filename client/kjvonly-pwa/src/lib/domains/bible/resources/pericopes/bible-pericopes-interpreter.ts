import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	BiblePericopesCandidate
} from './bible-pericopes-candidate';

export const BIBLE_PERICOPES_RESOURCE_TYPE =
	'kjvonly/overlays/pericopes';

export class BiblePericopesInterpreter
	implements ResourceInterpreter<
		BiblePericopesCandidate
	> {

	readonly resourceType =
		BIBLE_PERICOPES_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<
		BiblePericopesCandidate
	> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Pericopes Resource Type: ${resource.resourceType}`
			);
		}

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Pericopes Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length ===
			0
		) {
			throw new Error(
				'Bible Pericopes Resource root is not supported.'
			);
		}

		if (
			identifier.path.length ===
			2
		) {
			const [
				source,
				chapterRef
			] =
				identifier.path;

			validateChapterRef(
				chapterRef
			);

			return [
				{
					source,
					chapterRef,
					value:
						resource.value
				}
			];
		}

		if (
			identifier.path.length !==
			1
		) {
			throw new Error(
				`Invalid Bible Pericopes Resource path: ${resource.resourceId}`
			);
		}

		const [
			source
		] =
			identifier.path;

		if (
			!isRecord(
				resource.value
			)
		) {
			throw new Error(
				'Bible Pericopes bundle content must be an object.'
			);
		}

		return Object.entries(
			resource.value
		).map(
			([
				chapterRef,
				value
			]) => {
				validateChapterRef(
					chapterRef
				);

				return {
					source,
					chapterRef,
					value
				};
			}
		);
	}
}

function validateChapterRef(
	chapterRef: string
): void {
	const match =
		/^(\d+)_(\d+)$/.exec(
			chapterRef
		);

	if (!match) {
		throw new Error(
			`Invalid Bible Pericopes chapter reference: ${chapterRef}`
		);
	}

	const bookId =
		Number.parseInt(
			match[1],
			10
		);

	const chapterNumber =
		Number.parseInt(
			match[2],
			10
		);

	if (
		bookId <= 0 ||
		chapterNumber <= 0 ||
		String(bookId) !==
			match[1] ||
		String(chapterNumber) !==
			match[2]
	) {
		throw new Error(
			`Invalid Bible Pericopes chapter reference: ${chapterRef}`
		);
	}
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !==
			null &&
		!Array.isArray(
			value
		)
	);
}
