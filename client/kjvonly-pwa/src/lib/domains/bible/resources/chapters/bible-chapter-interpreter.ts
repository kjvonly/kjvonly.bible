import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
	extractResourcePath
} from '$lib/resource/utils/resource-identifier';

import type {
	BibleChapterCandidate
} from './bible-chapter-candidate';

export const BIBLE_CHAPTER_RESOURCE_TYPE =
	'kjvonly/bible/chapters';

export class BibleChapterInterpreter
	implements ResourceInterpreter<BibleChapterCandidate> {

	readonly resourceType =
		BIBLE_CHAPTER_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<BibleChapterCandidate> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Bible Chapter Resource Type: ${resource.resourceType}`
			);
		}

		const path =
			extractResourcePath(
				resource.resourceId
			);

		if (
			path.length ===
			2
		) {
			return [
				this.interpretChapter(
					path,
					resource.value
				)
			];
		}

		if (
			path.length ===
			1
		) {
			return this.interpretBundle(
				path[0],
				resource.value
			);
		}

		throw new Error(
			`Invalid Bible Chapter Resource path: ${resource.resourceId}`
		);
	}

	private interpretChapter(
		path: readonly string[],
		value: unknown
	): BibleChapterCandidate {
		const [
			version,
			chapterRef
		] = path;

		if (
			!version ||
			!chapterRef
		) {
			throw new Error(
				'Invalid Bible Chapter Resource path.'
			);
		}

		return {
			version,
			chapterRef,
			value
		};
	}

	private interpretBundle(
		version: string,
		value: unknown
	): readonly BibleChapterCandidate[] {
		if (
			!isRecord(
				value
			)
		) {
			throw new Error(
				'Bible Chapter bundle content must be an object.'
			);
		}

		return Object.entries(
			value
		).map(
			([
				entryRef,
				entryValue
			]) =>
				this.interpretBundleEntry(
					version,
					entryRef,
					entryValue
				)
		);
	}

	private interpretBundleEntry(
		version: string,
		entryRef: string,
		value: unknown
	): BibleChapterCandidate {
		const segments =
			entryRef.split('/');

		if (
			segments.length !==
			2
		) {
			throw new Error(
				`Invalid Bible Chapter bundle entry: ${entryRef}`
			);
		}

		const [
			entryVersion,
			chapterRef
		] = segments;

		if (
			!entryVersion ||
			!chapterRef
		) {
			throw new Error(
				`Invalid Bible Chapter bundle entry: ${entryRef}`
			);
		}

		if (
			entryVersion !==
			version
		) {
			throw new Error(
				`Bible Chapter bundle entry version does not match Resource version: ${entryRef}`
			);
		}

		return {
			version,
			chapterRef,
			value
		};
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