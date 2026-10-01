import type {
	ResourceDescriptor
} from './resource-descriptor';

/**
 * Validates untrusted descriptor data and returns a trusted ResourceDescriptor.
 *
 * Generic descriptor structure and Resource metadata are validated here while
 * provider-specific strategy data remains the responsibility of each strategy.
 */
export class ResourceDescriptorValidator {

	/**
	 * Validates one unknown descriptor value.
	 */
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

		const resourceMetadata =
			this.validateResourceMetadata(
				value.resourceMetadata
			);

		const strategy =
			this.validateStrategy(
				value.strategy
			);

		return {
			metadata,
			...(resourceMetadata === undefined
				? {}
				: { resourceMetadata }),
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

		const name =
			optionalString(
				value.name,
				'name'
			);

		const category =
			requireString(
				value.category,
				'category'
			);

		const dataType =
			optionalString(
				value.dataType,
				'dataType'
			);

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

		const representation =
			value.representation;

		if (
			representation !==
				'content' &&
			representation !==
				'descriptors'
		) {
			throw new Error(
				'Invalid Resource descriptor representation.'
			);
		}

		const mediaType =
			requireString(
				value.mediaType,
				'mediaType'
			);

		const size =
			validateSize(
				value.size
			);

		const hash =
			validateHash(
				value.hash
			);

		const attributes =
			validateAttributes(
				value.attributes
			);

		return {
			publisher,
			resourceId,
			...(name === undefined
				? {}
				: { name }),
			category,
			...(dataType === undefined
				? {}
				: { dataType }),
			modifiedAt,
			representation,
			mediaType,
			...(size === undefined
				? {}
				: { size }),
			...(hash === undefined
				? {}
				: { hash }),
			...(attributes === undefined
				? {}
				: { attributes })
		};
	}

	/**
	 * Validates optional protocol-agnostic Resource metadata without assigning
	 * Domain meaning to individual keys.
	 */
	private validateResourceMetadata(
		value: unknown
	): ResourceDescriptor['resourceMetadata'] {
		if (value === undefined) {
			return undefined;
		}

		if (!isObject(value)) {
			throw new Error(
				'Invalid Resource descriptor resourceMetadata.'
			);
		}

		for (const [name, metadataValue] of Object.entries(value)) {
			if (
				name.length === 0 ||
				typeof metadataValue !== 'string'
			) {
				throw new Error(
					'Invalid Resource descriptor resourceMetadata.'
				);
			}
		}

		return value as ResourceDescriptor['resourceMetadata'];
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

/** Validates an optional non-empty string metadata field. */
function optionalString(
	value: unknown,
	name: string
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	return requireString(
		value,
		name
	);
}

/** Validates optional resolved-byte size metadata. */
function validateSize(
	value: unknown
): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (
		typeof value !== 'number' ||
		!Number.isSafeInteger(value) ||
		value < 0
	) {
		throw new Error(
			'Invalid Resource descriptor size.'
		);
	}

	return value;
}

/** Validates optional algorithm-independent content digest metadata. */
function validateHash(
	value: unknown
): ResourceDescriptor['metadata']['hash'] {
	if (value === undefined) {
		return undefined;
	}

	if (!isObject(value)) {
		throw new Error(
			'Invalid Resource descriptor hash.'
		);
	}

	return {
		algorithm:
			requireString(
				value.algorithm,
				'hash algorithm'
			),
		value:
			requireString(
				value.value,
				'hash value'
			)
	};
}

/** Validates optional descriptor attributes used for catalog presentation. */
function validateAttributes(
	value: unknown
): ResourceDescriptor['metadata']['attributes'] {
	if (value === undefined) {
		return undefined;
	}

	if (!isObject(value)) {
		throw new Error(
			'Invalid Resource descriptor attributes.'
		);
	}

	return value;
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