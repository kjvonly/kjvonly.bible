import type {
	FileManagerResourceIconID
} from '../models/file-manager-icon.model';

/**
 * Resolves the icon used to present one Resource in FileManager.
 *
 * `resourceMetadata.icon` is an optional publisher-supplied icon ID. A known
 * icon ID wins. Missing or unknown values fall back only to the Resource's
 * semantic `dataType`; media type, Resource Type, and category intentionally do
 * not participate in icon selection.
 */
export function resolveResourceIconID(
	resourceIcon: string | undefined,
	dataType: string
): FileManagerResourceIconID {
	const iconID = normalize(resourceIcon);

	if (isResourceIconID(iconID)) {
		return iconID;
	}

	return resolveDataTypeIconID(dataType);
}

function resolveDataTypeIconID(
	dataType: string
): FileManagerResourceIconID {
	const normalizedDataType =
		normalize(dataType);

	if (normalizedDataType.includes('audio')) {
		return 'audio';
	}

	if (normalizedDataType.includes('video')) {
		return 'video';
	}

	if (normalizedDataType.includes('image')) {
		return 'image';
	}

	if (normalizedDataType.includes('note')) {
		return 'notes';
	}

	if (normalizedDataType.includes('book')) {
		return 'book';
	}

	if (normalizedDataType.includes('article')) {
		return 'article';
	}

	if (normalizedDataType.includes('post')) {
		return 'post';
	}

	if (normalizedDataType.includes('document')) {
		return 'document';
	}

	return 'other';
}

function isResourceIconID(
	value: string
): value is FileManagerResourceIconID {
	return RESOURCE_ICON_IDS.has(
		value as FileManagerResourceIconID
	);
}

function normalize(
	value: string | undefined
): string {
	return (value ?? '')
		.trim()
		.toLowerCase();
}

const RESOURCE_ICON_IDS =
	new Set<FileManagerResourceIconID>([
		'article',
		'notes',
		'post',
		'book',
		'audio',
		'video',
		'image',
		'document',
		'other'
	]);
