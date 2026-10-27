/**
 * Strong's-owned Resource ID grammar.
 *
 * Resource infrastructure treats `resourceId` as opaque. These helpers exist
 * only inside the Strong's Domain to create and interpret Strong's identities.
 */
export interface StrongsResourceIdentity {
	readonly edition: string;
	readonly key?: string;
}

export function createStrongsResourceId(
	edition: string,
	key?: string
): string {
	assertPart(
		edition,
		'edition'
	);

	if (
		key !== undefined
	) {
		assertPart(
			key,
			'key'
		);
	}

	return [
		'kjvonly',
		'strongs',
		'definition',
		edition,
		...(key === undefined
			? []
			: [key])
	].join('/');
}

export function parseStrongsResourceId(
	resourceId: string
): StrongsResourceIdentity {
	const segments =
		resourceId.split('/');

	if (
		segments.length < 4 ||
		segments.length > 5 ||
		segments[0] !== 'kjvonly' ||
		segments[1] !== 'strongs' ||
		segments[2] !== 'definition' ||
		segments.some(
			(segment) =>
				segment.length === 0
		)
	) {
		throw new Error(
			`Invalid Strong's Resource ID: ${resourceId}`
		);
	}

	const [
		,
		,
		,
		edition,
		key
	] = segments;

	return {
		edition,
		...(key === undefined
			? {}
			: { key })
	};
}

function assertPart(
	value: string,
	name: string
): void {
	if (
		value.length === 0 ||
		value.includes('/')
	) {
		throw new Error(
			`Invalid Strong's Resource ${name}: ${value}`
		);
	}
}
