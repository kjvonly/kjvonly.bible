import {
	createHash
} from 'node:crypto';

import type {
	EventDefinition,
	ObjectUploadDefinition
} from './manifest.js';


export interface DescriptorEventDefinitionRevisionInput {
	readonly kind:
		number;

	readonly event:
		EventDefinition;

	readonly objectUpload:
		ObjectUploadDefinition;

	readonly publisher:
		string;

	readonly strategy:
		unknown;
}


export function calculateDescriptorEventDefinitionRevision(
	input:
		DescriptorEventDefinitionRevisionInput
): string {

	const canonical =
		JSON.stringify(
			canonicalize({
				kind:
					input.kind,

				event: {
					encoding:
						input
							.event
							.encoding,

					tags:
						input
							.event
							.tags
				},

				objectUpload: {
					encoding:
						input
							.objectUpload
							.encoding,

					mediaType:
						input
							.objectUpload
							.mediaType
				},

				publisher:
					input.publisher,

				strategy:
					input.strategy
			})
		);


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


function canonicalize(
	value:
		unknown
): unknown {

	if (
		Array.isArray(
			value
		)
	) {
		return value.map(
			canonicalize
		);
	}


	if (
		value !==
			null &&
		typeof value ===
			'object'
	) {
		const object =
			value as Record<
				string,
				unknown
			>;


		return Object.fromEntries(
			Object
				.keys(
					object
				)
				.sort()
				.map(
					key => [
						key,
						canonicalize(
							object[
								key
							]
						)
					]
				)
		);
	}


	return value;
}