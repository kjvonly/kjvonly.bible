import type {
	BiblePericopes
} from '../../models/bible-pericopes.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	BIBLE_PERICOPES_RESOURCE_TYPE
} from './bible-pericopes-interpreter';

export class BiblePericopesResourcePublication {

	create(
		pericopes: BiblePericopes
	): ResourcePublication {
		const {
			publisher,
			source,
			chapterRef
		} = parseBiblePericopesId(
			pericopes.id
		);

		if (
			pericopes.chapterRef !==
				chapterRef
		) {
			throw new Error(
				`Bible Pericopes chapter does not match Domain identity: ${pericopes.id}`
			);
		}

		return {
			type:
				'resource',

			publisher,

			resourceType:
				BIBLE_PERICOPES_RESOURCE_TYPE,

			resourceId:
				`${BIBLE_PERICOPES_RESOURCE_TYPE}/${source}/${chapterRef}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value:
				pericopes.pericopes
		};
	}
}

function parseBiblePericopesId(
	id: string
): {
	readonly publisher: string;
	readonly source: string;
	readonly chapterRef: string;
} {
	const parts =
		id.split('/');

	if (
		parts.length !== 3 ||
		parts.some(
			(part) =>
				part.length === 0
		)
	) {
		throw new Error(
			`Invalid Bible Pericopes id: ${id}`
		);
	}

	const [
		publisher,
		source,
		chapterRef
	] = parts;

	return {
		publisher,
		source,
		chapterRef
	};
}
