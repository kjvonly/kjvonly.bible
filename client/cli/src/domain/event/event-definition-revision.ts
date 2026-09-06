import {
	createHash
} from 'node:crypto';

import type {
	EventDefinition
} from './manifest.js';


export interface EventDefinitionRevisionInput {
	readonly kind:
		number;

	readonly event:
		EventDefinition;

	readonly publisher:
		string;
}


export function calculateEventDefinitionRevision(
	input:
		EventDefinitionRevisionInput
): string {

	const canonical =
		JSON.stringify({
			kind:
				input.kind,

			event: {
				encoding: [
					...input
						.event
						.encoding
				],

				tags:
					input
						.event
						.tags
						.map(
							tag => [
								...tag
							]
						)
			},

			publisher:
				input.publisher
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