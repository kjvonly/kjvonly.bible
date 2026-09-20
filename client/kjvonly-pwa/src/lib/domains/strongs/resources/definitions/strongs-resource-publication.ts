import type {
	Strongs
} from '../../models/strongs.model';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	STRONGS_RESOURCE_TYPE
} from './strongs-interpreter';

export class StrongsResourcePublication {

	create(
		strongs: Strongs
	): ResourcePublication {
		const {
			publisher,
			version,
			key
		} = parseStrongsId(
			strongs.id
		);

		if (
			strongs.number !==
				key
		) {
			throw new Error(
				`Strong's number does not match Domain identity: ${strongs.id}`
			);
		}

		return {
			type:
				'resource',

			publisher,

			resourceType:
				STRONGS_RESOURCE_TYPE,

			resourceId:
				`${STRONGS_RESOURCE_TYPE}/${version}/${key}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				number:
					strongs.number,

				originalWord:
					strongs.originalWord,

				partsOfSpeech:
					strongs.partsOfSpeech,

				phoneticSpelling:
					strongs.phoneticSpelling,

				transliteratedWord:
					strongs.transliteratedWord,

				usageByBook:
					strongs.usageByBook,

				usageByWord:
					strongs.usageByWord,

				brownDef:
					strongs.brownDef,

				strongsDef:
					strongs.strongsDef,

				thayersDef:
					strongs.thayersDef
			}
		};
	}
}

function parseStrongsId(
	id: string
): {
	readonly publisher: string;
	readonly version: string;
	readonly key: string;
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
			`Invalid Strong's id: ${id}`
		);
	}

	const [
		publisher,
		version,
		key
	] = parts;

	return {
		publisher,
		version,
		key
	};
}
