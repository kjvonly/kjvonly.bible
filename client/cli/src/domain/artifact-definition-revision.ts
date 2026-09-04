import {
	createHash
} from 'node:crypto';

import type {
	ObjectUploadDefinition
} from './manifest.js';


export function calculateArtifactDefinitionRevision(
	objectUpload:
		ObjectUploadDefinition
): string {

	const canonical =
		JSON.stringify({
			encoding: [
				...objectUpload
					.encoding
			]
		});


	return createHash(
		'sha256'
	)
		.update(
			canonical
		)
		.digest(
			'hex'
		)
		.slice(
			0,
			8
		);
}