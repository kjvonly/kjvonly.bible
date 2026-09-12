import type {
	ResourcePublicationIntent
} from './resource-publication';

/**
 * Outbound transport boundary for publishing a Resource intent.
 *
 * Domain-specific Resource code prepares the complete publication or deletion
 * intent. A transport implementation decides how that intent is represented,
 * signed, and sent externally.
 */
export interface ResourcePublisher {
	publish(
		resource:
			ResourcePublicationIntent
	): Promise<void>;
}
