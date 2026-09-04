import type {
	EventDefinition
} from './manifest.js';


const KEY_TOKEN =
	'${key}';


export function interpolateKey(
	value:
		string,

	key:
		string
): string {

	return value
		.split(
			KEY_TOKEN
		)
		.join(
			key
		);
}


export function interpolateEventKey(
	event:
		EventDefinition,

	key:
		string
): EventDefinition {

	return {
		encoding: [
			...event.encoding
		],

		tags:
			event.tags.map(
				tag =>
					tag.map(
						value =>
							interpolateKey(
								value,
								key
							)
					)
			)
	};
}