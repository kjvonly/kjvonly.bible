import type {
	FileManagerIndexedFileType
} from '../models/file-manager-search-file-type.model';

/**
 * Classifies generic Resource metadata into FileManager's coarse Search type facet.
 *
 * This classification is only for metadata search/filtering. It does not select
 * Resource icons, define Resource identity, or participate in Module routing.
 */
export function classifySearchFileType(
	dataType: string,
	mediaType: string,
	resourceType: string,
	category: string
): FileManagerIndexedFileType {
	const media = mediaType.toLowerCase();

	if (media.startsWith('audio/')) {
		return 'audio';
	}

	if (media.startsWith('video/')) {
		return 'video';
	}

	if (media.startsWith('image/')) {
		return 'image';
	}

	const semantic = `${dataType} ${resourceType} ${category}`
		.toLowerCase();

	if (semantic.includes('audio')) {
		return 'audio';
	}

	if (semantic.includes('video')) {
		return 'video';
	}

	if (semantic.includes('image')) {
		return 'image';
	}

	if (
		media.startsWith('text/') ||
		media === 'application/pdf' ||
		semantic.includes('document') ||
		semantic.includes('article') ||
		semantic.includes('book') ||
		semantic.includes('blog') ||
		semantic.includes('sermon')
	) {
		return 'document';
	}

	return 'other';
}
