import {
	KJVONLY_ARCHIVE_VERSION,
	type ArchivedDomainObject,
	type KJVOnlyArchiveV1
} from './kjvonly-archive';

import type {
	ResourceInstallation
} from '$lib/resource';

export class KJVOnlyArchiveValidator {
	validate(
		value: unknown
	): KJVOnlyArchiveV1 {
		const archive =
			requireRecord(
				value,
				'Invalid KJVOnly archive: expected an object.'
			);

		if (
			archive.version !==
			KJVONLY_ARCHIVE_VERSION
		) {
			throw new Error(
				`Unsupported KJVOnly archive version: ${String(archive.version)}.`
			);
		}

		const domainObjects =
			requireRecord(
				archive.domain_objects,
				'Invalid KJVOnly archive: domain_objects must be an object.'
			);

		const resourceInstallations =
			requireRecord(
				archive.resource_installations,
				'Invalid KJVOnly archive: resource_installations must be an object.'
			);

		for (
			const [
				key,
				candidate
			] of Object.entries(
				domainObjects
			)
		) {
			this.validateDomainObject(
				key,
				candidate
			);
		}

		for (
			const [
				key,
				candidate
			] of Object.entries(
				resourceInstallations
			)
		) {
			const installation =
				this.validateResourceInstallation(
					key,
					candidate
				);

			const domainObject =
				domainObjects[
					key
				];

			if (!domainObject) {
				throw new Error(
					`Invalid KJVOnly archive: Resource Installation ${key} has no matching Domain Object.`
				);
			}

			const validatedDomainObject =
				this.validateDomainObject(
					key,
					domainObject
				);

			if (
				installation.objectType !==
				validatedDomainObject.objectType
			) {
				throw new Error(
					`Invalid KJVOnly archive: objectType mismatch for ${key}.`
				);
			}

			if (
				installation.objectId !==
				validatedDomainObject.objectId
			) {
				throw new Error(
					`Invalid KJVOnly archive: objectId mismatch for ${key}.`
				);
			}
		}

		return value as KJVOnlyArchiveV1;
	}

	private validateDomainObject(
		key: string,
		value: unknown
	): ArchivedDomainObject {
		const domainObject =
			requireRecord(
				value,
				`Invalid KJVOnly archive: Domain Object ${key} must be an object.`
			);

		requireNonEmptyString(
			domainObject.id,
			`Invalid KJVOnly archive: Domain Object ${key} requires id.`
		);

		if (
			domainObject.id !==
			key
		) {
			throw new Error(
				`Invalid KJVOnly archive: Domain Object key ${key} does not match record id ${String(domainObject.id)}.`
			);
		}

		requireNonEmptyString(
			domainObject.objectType,
			`Invalid KJVOnly archive: Domain Object ${key} requires objectType.`
		);

		requireNonEmptyString(
			domainObject.objectId,
			`Invalid KJVOnly archive: Domain Object ${key} requires objectId.`
		);

		if (
			!Object.prototype.hasOwnProperty.call(
				domainObject,
				'value'
			)
		) {
			throw new Error(
				`Invalid KJVOnly archive: Domain Object ${key} requires value.`
			);
		}

		return domainObject as unknown as ArchivedDomainObject;
	}

	private validateResourceInstallation(
		key: string,
		value: unknown
	): ResourceInstallation {
		const installation =
			requireRecord(
				value,
				`Invalid KJVOnly archive: Resource Installation ${key} must be an object.`
			);

		requireNonEmptyString(
			installation.id,
			`Invalid KJVOnly archive: Resource Installation ${key} requires id.`
		);

		if (
			installation.id !==
			key
		) {
			throw new Error(
				`Invalid KJVOnly archive: Resource Installation key ${key} does not match record id ${String(installation.id)}.`
			);
		}

		requireNonEmptyString(
			installation.objectType,
			`Invalid KJVOnly archive: Resource Installation ${key} requires objectType.`
		);

		requireNonEmptyString(
			installation.objectId,
			`Invalid KJVOnly archive: Resource Installation ${key} requires objectId.`
		);

		requireNonEmptyString(
			installation.publisher,
			`Invalid KJVOnly archive: Resource Installation ${key} requires publisher.`
		);

		if (
			installation.resourceId !==
			undefined
		) {
			requireNonEmptyString(
				installation.resourceId,
				`Invalid KJVOnly archive: Resource Installation ${key} resourceId must be a non-empty string when present.`
			);
		}

		if (
			typeof installation.modifiedAt !==
				'number' ||
			!Number.isSafeInteger(
				installation.modifiedAt
			) ||
			installation.modifiedAt < 0
		) {
			throw new Error(
				`Invalid KJVOnly archive: Resource Installation ${key} requires a non-negative integer modifiedAt.`
			);
		}

		return installation as unknown as ResourceInstallation;
	}
}

function requireRecord(
	value: unknown,
	message: string
): Record<string, unknown> {
	if (
		typeof value !== 'object' ||
		value === null ||
		Array.isArray(value)
	) {
		throw new Error(
			message
		);
	}

	return value as Record<
		string,
		unknown
	>;
}

function requireNonEmptyString(
	value: unknown,
	message: string
): asserts value is string {
	if (
		typeof value !== 'string' ||
		value.length === 0
	) {
		throw new Error(
			message
		);
	}
}
