/**
 * Reading Plans-owned Resource ID grammar.
 *
 * Resource infrastructure treats `resourceId` as opaque. These helpers exist
 * only inside the Reading Plans Domain to create and interpret identities.
 */
export function createReadingPlanResourceId(
	kind: string,
	...identity: readonly string[]
): string {
	assertPart(
		kind,
		'kind'
	);

	for (
		const part of identity
	) {
		assertPart(
			part,
			'identity'
		);
	}

	return [
		'kjvonly',
		'reading-plans',
		kind,
		...identity
	].join('/');
}

export function parseReadingPlanResourceId(
	resourceId: string,
	kind: string,
	identityLengths:
		readonly number[],
	resourceName: string
): readonly string[] {
	const segments =
		resourceId.split('/');

	if (
		segments[0] !== 'kjvonly' ||
		segments[1] !== 'reading-plans' ||
		segments[2] !== kind ||
		segments.some(
			(segment) =>
				segment.length === 0
		)
	) {
		throw new Error(
			`Invalid ${resourceName} Resource ID: ${resourceId}`
		);
	}

	const identity =
		segments.slice(3);

	if (
		!identityLengths.includes(
			identity.length
		)
	) {
		throw new Error(
			`Invalid ${resourceName} Resource ID: ${resourceId}`
		);
	}

	return identity;
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
			`Invalid Reading Plan Resource ${name}: ${value}`
		);
	}
}
