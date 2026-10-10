import type {
	PublishedResourceReference,
	ResourceDescriptor,
	ResourceDescriptorValidator,
	ResourceLoader
} from '$lib/resource';

import type {
	OutboxWakeup
} from '$lib/application';

import type {
	NormalizedContentTextMarkup
} from '../models/normalized-content-text-markup.model';

import {
	createNormalizedContentTextMarkupId
} from '../models/normalized-content-text-markup.model';

import type {
	NormalizedContentTextMarkupStore
} from '../persistence/normalized-content-text-markup-store';

import type {
	NormalizedContentTextMarkupWriteTransaction
} from '../resources/text-markup/normalized-content-text-markup-write-stores';

import type {
	NormalizedContentTextMarkupResourcePublication
} from '../resources/text-markup/normalized-content-text-markup-resource-publication';

import {
	createNormalizedContentTextMarkupResourceId
} from '../resources/text-markup/normalized-content-text-markup-resource';

import {
	assertNormalizedDocumentDataContract
} from '../resources/normalized-content-resource-contract';

type NormalizedContentTextMarkupSubscriber = {
	readonly subscriberId:
		string;

	readonly textMarkupId:
		string;

	readonly onChange:
		(
			textMarkup:
				NormalizedContentTextMarkup
		) => void;
};

/**
 * Application-facing lifecycle for user-owned Normalized Content Text Markup.
 *
 * A markup object targets one exact document Resource snapshot. Local accepted
 * state is authoritative; Resource discovery is attempted only when that exact
 * markup object is not already installed.
 */
export class NormalizedContentTextMarkupService {

	private subscribers:
		NormalizedContentTextMarkupSubscriber[] =
		[];

	// Only the latest in-flight local refresh may publish a snapshot to readers.
	private readonly pendingRefreshes =
		new Map<string, symbol>();

	constructor(
		private readonly textMarkup:
			Pick<
				NormalizedContentTextMarkupStore,
				'get'
			>,

		private readonly resourceLoader:
			Pick<
				ResourceLoader<string>,
				'load'
			>,

		private readonly writeTransaction:
			NormalizedContentTextMarkupWriteTransaction,

		private readonly resourcePublication:
			Pick<
				NormalizedContentTextMarkupResourcePublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup,

		private readonly descriptorValidator:
			Pick<
				ResourceDescriptorValidator,
				'validate'
			>
	) {}

	/**
	 * Persists one accepted draft and queues its outbound Resource publication.
	 * A successful return means the local transaction committed, not that a
	 * remote relay accepted the event. Subscriber failures do not undo a commit.
	 *
	 * @param textMarkup User-owned markings for one exact document snapshot.
	 */
	async put(
		textMarkup:
			NormalizedContentTextMarkup
	): Promise<void> {
		const publication =
			this.resourcePublication
				.create(
					textMarkup
				);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores
					.textMarkup
					.put(
						textMarkup
					);

				await stores
					.outbox
					.put(
						textMarkup.id,
						publication
					);
			}
		);

		// A previously started archive refresh must not repaint an older
		// snapshot after this local write commits.
		this.pendingRefreshes.delete(
			textMarkup.id
		);
		this.notify(
			textMarkup
		);

		this.outbox.wake();
	}

	/**
	 * Registers or replaces a Reader subscriber by its instance ID.
	 *
	 * @param subscriberId Unique identity of the subscribing Reader instance.
	 * @param textMarkupId Exact user/document/snapshot Domain Object identity.
	 * @param onChange Notification of a newly accepted markup object.
	 */
	subscribe(
		subscriberId: string,
		textMarkupId: string,
		onChange:
			(
				textMarkup:
					NormalizedContentTextMarkup
			) => void
	): void {
		this.unsubscribe(
			subscriberId
		);

		this.subscribers.push({
			subscriberId,
			textMarkupId,
			onChange
		});
	}

	/** @param subscriberId Reader instance whose subscription must be removed. */
	unsubscribe(
		subscriberId: string
	): void {
		this.subscribers =
			this.subscribers.filter(
				(subscriber) =>
					subscriber.subscriberId !==
					subscriberId
			);
	}

	/**
	 * Re-reads local accepted markup for currently subscribed identities.
	 * The latest refresh wins; saves invalidate earlier reads, and replaced
	 * subscribers cannot receive callbacks from their previous registration.
	 * Typically invoked following a Resource archive import.
	 */
	async refresh(): Promise<void> {
		// Capture the subscribers and tokens before the first asynchronous read.
		// Later refreshes replace these tokens; local saves invalidate them.
		const refreshes =
			[...new Set(this.subscribers.map(
				(subscriber) => subscriber.textMarkupId
			))].map((textMarkupId) => ({
				textMarkupId,
				token: Symbol(),
				subscribers: this.subscribers.filter(
					(subscriber) => subscriber.textMarkupId === textMarkupId
				)
			}));

		for (const { textMarkupId, token } of refreshes) {
			this.pendingRefreshes.set(textMarkupId, token);
		}

		try {
			for (const { textMarkupId, token, subscribers } of refreshes) {
				if (this.pendingRefreshes.get(textMarkupId) !== token) {
					continue;
				}

				const textMarkup = await this.textMarkup.get(textMarkupId);

				if (
					textMarkup !== undefined &&
					this.pendingRefreshes.get(textMarkupId) === token
				) {
					this.notify(textMarkup, subscribers);
				}
			}
		} finally {
			for (const { textMarkupId, token } of refreshes) {
				if (this.pendingRefreshes.get(textMarkupId) === token) {
						this.pendingRefreshes.delete(textMarkupId);
					}
			}
		}
	}

	/**
	 * Creates the valid empty markup object for one user and exact document
	 * Resource snapshot. This gives the Reader stable Domain identity before
	 * asynchronous Resource loading completes.
	 *
	 * @param publisher Authenticated owner of the markup (not document author).
	 * @param descriptor Validated against the Normalized Document data contract;
	 *   supplies target document publisher, opaque Resource ID and modifiedAt.
	 */
	create(
		publisher:
			string,

		descriptor:
			unknown
	): NormalizedContentTextMarkup {
		const document =
			this.readDocumentReference(
				descriptor
			);

		return {
			id:
				createNormalizedContentTextMarkupId(
					publisher,
					document.publisher,
					document.resourceId,
					document.modifiedAt
				),

			document,

			markings:
				{}
		};
	}

	/**
	 * Returns markup for one user and exact document Resource snapshot.
	 *
	 * Local accepted state is checked first. On a miss, the exact user-owned
	 * markup Resource is loaded through the generic Resource lifecycle and the
	 * accepted Domain object is then re-read from local persistence.
	 *
	 * @param publisher Authenticated owner of the requested Text Markup.
	 * @param descriptor Descriptor for the exact Normalized Document snapshot.
	 * @returns Accepted markup or a new empty markup when no Resource exists.
	 */
	async get(
		publisher:
			string,

		descriptor:
			unknown
	): Promise<NormalizedContentTextMarkup> {
		const empty =
			this.create(
				publisher,
				descriptor
			);

		const existing =
			await this.textMarkup.get(
				empty.id
			);

		if (
			existing !==
			undefined
		) {
			return existing;
		}

		const loadRequest =
			createTextMarkupLoadRequest(
				publisher,
				empty
			);

		const found =
			await this.resourceLoader.load(
				loadRequest.source,
				loadRequest.key
			);

		if (!found) {
			return empty;
		}

		const installed =
			await this.textMarkup.get(
				empty.id
			);

		if (
			installed ===
			undefined
		) {
			throw new Error(
				`Normalized Content Text Markup was not installed: ${empty.id}`
			);
		}

		return installed;
	}

	private readDocumentReference(
		descriptor:
			unknown
	): NormalizedContentTextMarkup['document'] {
		const validated =
			this.descriptorValidator
				.validate(
					descriptor
				);

		assertNormalizedDocumentDataContract(
			validated.metadata.dataType,
			validated.metadata.dataVersion
		);

		return {
			publisher:
				validated.metadata.publisher,
			resourceId:
				validated.metadata.resourceId,
			modifiedAt:
				validated.metadata.modifiedAt
		};
	}

	private notify(
		textMarkup:
			NormalizedContentTextMarkup,
		subscribers: readonly NormalizedContentTextMarkupSubscriber[] =
			this.subscribers
	): void {
		for (const subscriber of subscribers) {
			if (
				subscriber.textMarkupId !== textMarkup.id ||
				!this.subscribers.includes(subscriber)
			) {
				continue;
			}

			try {
				subscriber.onChange(
					textMarkup
				);
			} catch (error) {
				// The write is already durable. One faulty observer must not
				// prevent Outbox publication or other readers from updating.
				console.error(
					'Normalized Content Text Markup subscriber failed',
					error
				);
			}
		}
	}
}

interface TextMarkupLoadRequest {
	readonly source:
		PublishedResourceReference;

	readonly key:
		string;
}

/**
 * Adapts the exact Domain-owned Text Markup Resource ID to the application's
 * append-style ResourceLoader without duplicating Resource ID grammar.
 */
function createTextMarkupLoadRequest(
	publisher: string,
	textMarkup: NormalizedContentTextMarkup
): TextMarkupLoadRequest {
	const resourceId =
		createNormalizedContentTextMarkupResourceId(
			textMarkup.document.publisher,
			textMarkup.document.resourceId,
			textMarkup.document.modifiedAt
		);

	const revision =
		`/${textMarkup.document.modifiedAt}`;

	if (!resourceId.endsWith(revision)) {
		throw new Error(
			`Invalid Normalized Content Text Markup Resource id: ${resourceId}`
		);
	}

	return {
		source: {
			publisher,
			resourceId:
				resourceId.slice(
					0,
					-revision.length
				)
		},

		key:
			String(
				textMarkup.document.modifiedAt
			)
	};
}
