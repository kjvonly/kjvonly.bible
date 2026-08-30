import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

export type ResourceSelections =
	Record<
		string,
		PublishedResourceReference
	>;

export function requireResourceSelection(
	selections:
		ResourceSelections |
		undefined,

	resourceType:
		string
): PublishedResourceReference {

	const selection =
		selections?.[
			resourceType
		];

	if (!selection) {
		throw new Error(
			`No Resource selection for type: ${resourceType}`
		);
	}

	return selection;
}