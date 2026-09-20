import {
	type PublishedResourceReference,
	type ResourceLoader,
	parseResourceIdentifier
} from '$lib/resource';

import type {
	BiblePericopes
} from '../models/bible-pericopes.model';

import {
	createBiblePericopesId
} from '../models/bible-pericopes.model';

import type {
	BiblePericopesStore
} from '../persistence/bible-pericopes-store';


import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from '../resources/pericopes/bible-pericopes-interpreter';

import type {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

export class PericopesService {

	constructor(
		private readonly pericopes:
			Pick<
				BiblePericopesStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>,

		private readonly bibleLocationReferenceService:
			Pick<
				BibleLocationReferenceService,
				'extractBookIDChapter'
			>
	) {}

	async get(
		source:
			PublishedResourceReference,

		bibleLocationRef:
			string
	): Promise<BiblePericopes> {

		const {
			source: pericopeSource
		} =
			parsePericopesSource(
				source
			);

		const chapterRef =
			this.bibleLocationReferenceService
				.extractBookIDChapter(
					bibleLocationRef
				);

		const pericopesId =
			createBiblePericopesId(
				source.publisher,
				pericopeSource,
				chapterRef
			);

		const existing =
			await this.pericopes.get(
				pericopesId
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
				chapterRef
			);

		if (!found) {
			throw new Error(
				`Bible Pericopes Resource not found: ${source.publisher}/${source.resourceId}`
			);
		}

		const installed =
			await this.pericopes.get(
				pericopesId
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Bible Pericopes were not installed: ${pericopesId}`
			);
		}

		return installed;
	}
}

function parsePericopesSource(
	source:
		PublishedResourceReference
): {
	readonly source:
		string;
} {

	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		BIBLE_PERICOPES_RESOURCE_TYPE
	) {
		throw new Error(
			`Invalid Bible Pericopes Resource Type: ${identifier.resourceType}`
		);
	}

	if (
		identifier.path.length !==
		1
	) {
		throw new Error(
			`Invalid Bible Pericopes Resource source: ${source.resourceId}`
		);
	}

	return {
		source:
			identifier.path[0]
	};
}
