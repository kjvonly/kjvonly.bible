import type {
	PublishedResourceReference,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
} from './resource-resolution-result';

import type {
	ResourceDescriptorContentResolver
} from './resource-descriptor-content-resolver';

import type {
	ResourceDescriptorPreparer
} from './resource-descriptor-preparer';

import type {
	ResourceDescriptorTerminalResolver
} from './resource-descriptor-terminal-resolver';


const MAX_DESCRIPTOR_NESTING_DEPTH =
	3;


/**
 * Operation-local state used while traversing nested descriptor collections.
 */
interface ResourceDescriptorGraphContext {
	readonly depth:
		number;

	readonly visited:
		ReadonlySet<string>;
}


/**
 * Resolves descriptor-document entries as a nested Resource descriptor graph.
 *
 * This class owns graph traversal policy: path-local cycle detection, maximum
 * nesting depth, nested descriptor-document decoding, sibling failure isolation,
 * recursion, and flattening nested outcomes into one ResourceResolutionResult.
 * Descriptor validation/currentness, byte retrieval, and terminal content
 * creation remain delegated to focused collaborators.
 */
export class ResourceDescriptorGraphResolver {
	constructor(
		private readonly documentDecoder:
			Pick<
				ResourceDescriptorDocumentDecoder,
				'decode'
			>,

		private readonly descriptorPreparer:
			Pick<
				ResourceDescriptorPreparer,
				'prepare'
			>,

		private readonly descriptorContentResolver:
			Pick<
				ResourceDescriptorContentResolver,
				'resolve'
			>,

		private readonly descriptorTerminalResolver:
			Pick<
				ResourceDescriptorTerminalResolver,
				'resolve'
			>
	) {}

	/**
	 * Resolves the entries from one descriptor document while treating the
	 * containing Resource as the initial visited graph node.
	 */
	resolve(
		entries:
			readonly unknown[],

		root:
			PublishedResourceReference
	): Promise<
		ResourceResolutionResult
	> {
		return this.resolveEntries(
			entries,
			{
				depth:
					0,

				visited:
					new Set([
						createResourceIdentity(
							root.publisher,
							root.resourceId
						)
					])
			}
		);
	}

	/**
	 * Resolves one already-known Resource descriptor as the root of a descriptor
	 * graph without requiring an enclosing Resource representation.
	 *
	 * The descriptor still passes through the same preparation, currentness,
	 * strategy, nesting, cycle/depth, and failure semantics as descriptors that
	 * originated from a decoded descriptor document.
	 */
	resolveDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<
		ResourceResolutionResult
	> {
		return this.resolveEntries(
			[
				descriptor
			],
			{
				depth:
					0,

				visited:
					new Set()
			}
		);
	}

	/**
	 * Resolves one descriptor-document level and recursively merges any nested
	 * descriptor collections into the flat Resource resolution result.
	 */
	private async resolveEntries(
		entries:
			readonly unknown[],

		context:
			ResourceDescriptorGraphContext
	): Promise<
		ResourceResolutionResult
	> {
		const contents:
			VerifiedResourceContent[] =
				[];

		const current:
			ResourceResolutionCurrent[] =
				[];

		const failures:
			ResourceResolutionFailure[] =
				[];

		for (
			const entry
			of entries
		) {
			const preparation =
				await this.descriptorPreparer.prepare(
					entry
				);

			if (
				preparation.status ===
				'current'
			) {
				const descriptor =
					preparation.descriptor;

				current.push({
					publisher:
						descriptor.metadata.publisher,

					resourceId:
						descriptor.metadata.resourceId,

					resourceType:
						descriptor.metadata.category
				});

				continue;
			}

			if (
				preparation.status ===
				'failed'
			) {
				const descriptor =
					preparation.descriptor;

				if (
					descriptor ===
					undefined
				) {
					failures.push({
						error:
							preparation.error
					});

					continue;
				}

				failures.push({
					publisher:
						descriptor.metadata.publisher,

					resourceId:
						descriptor.metadata.resourceId,

					resourceType:
						descriptor.metadata.category,

					error:
						preparation.error
				});

				continue;
			}

			const descriptor =
				preparation.descriptor;

			try {
				if (
					descriptor.metadata.representation ===
					'descriptors'
				) {
					const identity =
						createResourceIdentity(
							descriptor.metadata.publisher,
							descriptor.metadata.resourceId
						);

					if (
						context.visited.has(
							identity
						)
					) {
						throw new Error(
							`Resource descriptor cycle: ${descriptor.metadata.publisher}/${descriptor.metadata.resourceId}`
						);
					}

					if (
						context.depth >=
						MAX_DESCRIPTOR_NESTING_DEPTH
					) {
						throw new Error(
							`Maximum Resource descriptor nesting depth exceeded: ${MAX_DESCRIPTOR_NESTING_DEPTH}`
						);
					}

					const content =
						await this.descriptorContentResolver.resolve(
							descriptor
						);

					const nestedEntries =
						await this.documentDecoder.decode(
							descriptor.metadata.mediaType,
							content
						);

					const visited =
						new Set(
							context.visited
						);

					visited.add(
						identity
					);

					const nested =
						await this.resolveEntries(
							nestedEntries,
							{
								depth:
									context.depth +
									1,

								visited
							}
						);

					contents.push(
						...nested.contents
					);

					current.push(
						...nested.current
					);

					failures.push(
						...nested.failures
					);

					continue;
				}

				contents.push(
					await this.descriptorTerminalResolver.resolve(
						descriptor
					)
				);
			} catch (error) {
				failures.push({
					publisher:
						descriptor.metadata.publisher,

					resourceId:
						descriptor.metadata.resourceId,

					resourceType:
						descriptor.metadata.category,

					error
				});
			}
		}

		return {
			contents,
			current,
			failures
		};
	}
}


/**
 * Creates the path-local identity used for descriptor cycle detection.
 */
function createResourceIdentity(
	publisher:
		string,

	resourceId:
		string
): string {
	return JSON.stringify([
		publisher,
		resourceId
	]);
}
