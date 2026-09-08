import {
	extractResourceType
} from '$lib/resource/utils/resource-identifier';

import type {
	ResourceDescriptor
} from './resource-descriptor';

export class ResourceDescriptorValidator {

	validate(
		value: unknown
	): ResourceDescriptor {

		if (!isObject(value)) {
			throw new Error(
				'Invalid Resource descriptor.'
			);
		}

		const metadata =
			this.validateMetadata(
				value.metadata
			);

		const strategy =
			this.validateStrategy(
				value.strategy
			);

		return {
			metadata,
			strategy
		};
	}

	private validateMetadata(
		value: unknown
	): ResourceDescriptor['metadata'] {

		if (!isObject(value)) {
			throw new Error(
				'Resource descriptor is missing valid metadata.'
			);
		}

		const publisher =
			requireString(
				value.publisher,
				'publisher'
			);

		if (
			!/^[0-9a-f]{64}$/.test(
				publisher
			)
		) {
			throw new Error(
				'Invalid Resource descriptor publisher.'
			);
		}

		const resourceId =
			requireString(
				value.resourceId,
				'resourceId'
			);

		const category =
			requireString(
				value.category,
				'category'
			);

		const resourceType =
			extractResourceType(
				resourceId
			);

		if (
			category !==
			resourceType
		) {
			throw new Error(
				`Invalid Resource descriptor category: ${category}`
			);
		}

		const modifiedAt =
			value.modifiedAt;

		if (
			typeof modifiedAt !==
				'number' ||
			!Number.isSafeInteger(
				modifiedAt
			) ||
			modifiedAt < 0
		) {
			throw new Error(
				'Invalid Resource descriptor modifiedAt.'
			);
		}

		const mediaType =
			requireString(
				value.mediaType,
				'mediaType'
			);

		return {
			publisher,
			resourceId,
			category,
			modifiedAt,
			mediaType
		};
	}

	private validateStrategy(
		value: unknown
	): ResourceDescriptor['strategy'] {

		if (!isObject(value)) {
			throw new Error(
				'Resource descriptor is missing valid strategy.'
			);
		}

		const type =
			requireString(
				value.type,
				'strategy type'
			);

		if (
			!Object.prototype
				.hasOwnProperty.call(
					value,
					'data'
				)
		) {
			throw new Error(
				'Resource descriptor is missing strategy data.'
			);
		}

		return {
			type,
			data:
				value.data
		};
	}
}

function isObject(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value ===
			'object' &&
		value !== null &&
		!Array.isArray(
			value
		)
	);
}

function requireString(
	value: unknown,
	name: string
): string {

	if (
		typeof value !==
			'string' ||
		value.length === 0
	) {
		throw new Error(
			`Resource descriptor is missing valid ${name}.`
		);
	}

	return value;
}