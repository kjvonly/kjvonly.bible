import type {
	ResourcePublication
} from './resource-publication';

/**
 * Outbound transport boundary for publishing a Resource.
 *
 * Domain-specific Resource code prepares the complete ResourcePublication.
 * A transport implementation decides how that Resource is represented,
 * signed, and sent externally.
 */
export interface ResourcePublisher {
	publish(
		resource:
			ResourcePublication
	): Promise<void>;
}
