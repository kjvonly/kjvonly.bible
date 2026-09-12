import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	parseNoteId
} from '$lib/domains/notes/models/note-id';

import type {
	NotesStore
} from '$lib/domains/notes/persistence/notes-store';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallResult
} from '$lib/resource/services/resource-install-result';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

import {
	createNoteIdForSource,
	parseNotesResourceSource
} from './notes-resource-source';

interface NotesResourceDiscovery {
	listByType(
		publisher: string,
		resourceType: string
	): Promise<readonly ResourceRepresentation[]>;
}

interface NotesResourceInstaller {
	install(
		reference: PublishedResourceReference
	): Promise<ResourceInstallResult>;
}

/**
 * Acquires the concrete Note Resources represented by one selected Notes
 * source and returns the accepted Domain Objects after installation.
 *
 * The selected source is a collection boundary such as:
 *
 *     publisher + kjvonly/notes/entries/default
 *
 * Individual Note Resources are discovered by Resource Type and then filtered
 * to that selected source. Installation remains delegated to the generic
 * Resource lifecycle.
 */
export class NotesResourceAcquisition {
	constructor(
		private readonly discovery:
			NotesResourceDiscovery,

		private readonly installer:
			NotesResourceInstaller,

		private readonly store:
			Pick<
				NotesStore,
				'get' | 'getAll'
			>
	) {}

	async acquire(
		source: PublishedResourceReference
	): Promise<readonly Note[]> {
		const {
			name
		} = parseNotesResourceSource(
			source
		);

		const discovered =
			await this.discovery.listByType(
				source.publisher,
				NOTES_RESOURCE_TYPE
			);

		const accepted =
			new Map<string, Note>();

		for (
			const resource of discovered
		) {
			const path =
				this.matchSource(
					source,
					name,
					resource
				);

			if (path === null) {
				continue;
			}

			const result =
				await this.installer.install({
					publisher:
						resource.publisher,

					resourceId:
						resource.resourceId
				});

			if (!result.found) {
				continue;
			}

			this.assertSuccessful(
				result
			);

			if (path.length === 2) {
				const note =
					await this.store.get(
						createNoteIdForSource(
							source,
							path[1]
						)
					);

				if (note !== undefined) {
					accepted.set(
						note.id,
						note
					);
				}

				continue;
			}

			for (
				const note of await this.store.getAll()
			) {
				if (
					this.belongsToSource(
						source,
						name,
						note
					)
				) {
					accepted.set(
						note.id,
						note
					);
				}
			}
		}

		return [
			...accepted.values()
		];
	}

	private matchSource(
		source: PublishedResourceReference,
		name: string,
		resource: ResourceRepresentation
	): readonly string[] | null {
		if (
			resource.publisher !==
				source.publisher ||
			resource.resourceType !==
				NOTES_RESOURCE_TYPE
		) {
			return null;
		}

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
				NOTES_RESOURCE_TYPE ||
			identifier.path[0] !==
				name ||
			(
				identifier.path.length !== 1 &&
				identifier.path.length !== 2
			)
		) {
			return null;
		}

		return identifier.path;
	}

	private belongsToSource(
		source: PublishedResourceReference,
		name: string,
		note: Note
	): boolean {
		try {
			const id =
				parseNoteId(
					note.id
				);

			return (
				id.publisher ===
					source.publisher &&
				id.name ===
					name
			);
		} catch {
			return false;
		}
	}

	private assertSuccessful(
		result: ResourceInstallResult
	): void {
		for (
			const outcome of result.resources
		) {
			if (
				outcome.status ===
					'handled' ||
				outcome.status ===
					'current'
			) {
				continue;
			}

			if (
				outcome.status ===
					'failed'
			) {
				throw outcome.error;
			}

			throw new Error(
				`Unsupported Resource Type: ${outcome.resourceType}`
			);
		}
	}
}
