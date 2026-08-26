export interface ResourceIdentifier {
	readonly resourceType:
		string;

	readonly path:
		readonly string[];
}

export function parseResourceIdentifier(
	resourceId: string
): ResourceIdentifier {
	const segments =
		resourceId.split('/');

	if (
		segments.length < 3 ||
		segments.some(
			(segment) =>
				segment.length === 0
		)
	) {
		throw new Error(
			`Invalid Resource Identifier: ${resourceId}`
		);
	}

	return {
		resourceType:
			segments
				.slice(
					0,
					3
				)
				.join('/'),

		path:
			segments.slice(
				3
			)
	};
}

export function extractResourceType(
	resourceId: string
): string {
	return parseResourceIdentifier(
		resourceId
	).resourceType;
}

export function extractResourcePath(
	resourceId: string
): readonly string[] {
	return parseResourceIdentifier(
		resourceId
	).path;
}