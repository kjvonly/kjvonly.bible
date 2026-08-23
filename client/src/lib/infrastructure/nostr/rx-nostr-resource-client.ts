import {
	createRxOneshotReq,
	latest,
	timeline,
	uniq,
	type RxNostr
} from 'rx-nostr';

import {
	lastValueFrom,
	map
} from 'rxjs';

import type {
	Event,
	Filter
} from 'nostr-typedef';

import type {
	ResourceClient,
	ResourceClientRequestOptions,
    ResourceRelay
} from '$lib/resource/nostr/resource-client';

/**
 * rx-nostr implementation of the Resource Client.
 *
 * During the phased implementation this class implements only the
 * bounded-read portion of ResourceClient. Additional operations are
 * added in later phases.
 */
export class RxNostrResourceClient
	implements Pick<ResourceClient, 'getEvent' | 'getEvents'>
{
	constructor(
		private readonly rxNostr: RxNostr
	) {}

	/**
	 * Retrieves the current event matching a bounded Nostr query.
	 *
	 * Each relay is limited to one result. When multiple relays return
	 * different candidates, rx-nostr's latest() operator selects the
	 * current event using Nostr event ordering.
	 */
	async getEvent(
		filter: Filter,
		options?: ResourceClientRequestOptions
	): Promise<Event | null> {
		const request = createRxOneshotReq({
			filters: {
				...filter,
				limit: 1
			}
		});

		const event$ = this.rxNostr
			.use(
				request,
				this.createReadOptions(options)
			)
			.pipe(
				uniq(),
				latest(),
				map(({ event }) => event)
			);

		return lastValueFrom(event$, {
			defaultValue: null
		});
	}

	/**
	 * Retrieves all matching events from a bounded Nostr query.
	 *
	 * Identical signed events returned by multiple relays are
	 * deduplicated by event id.
	 *
	 * The final result is ordered newest-first according to Nostr
	 * event ordering.
	 */
	async getEvents(
		filters: Filter | readonly Filter[],
		options?: ResourceClientRequestOptions
	): Promise<readonly Event[]> {
		const request = createRxOneshotReq({
			filters: normalizeFilters(filters)
		});

		const events$ = this.rxNostr
			.use(
				request,
				this.createReadOptions(options)
			)
			.pipe(
				uniq(),
				timeline(),
				map((packets) =>
					packets.map(({ event }) => event)
				)
			);

		return lastValueFrom(events$, {
			defaultValue: []
		});
	}

	/**
	 * Builds rx-nostr read options for this operation.
	 *
	 * When no relay override is supplied, rx-nostr uses the configured
	 * default read relays.
	 *
	 * When relays are supplied, only those temporary relays are used
	 * for this operation.
	 */
	private createReadOptions(
		options?: ResourceClientRequestOptions
	) {
		if (options?.relays === undefined) {
			return undefined;
		}

		return {
			on: {
				relays: [...options.relays],
				defaultReadRelays: false
			}
		};
	}
    setDefaultRelays(
	relays: readonly ResourceRelay[]
): void {
	this.rxNostr.setDefaultRelays(
		relays.map((relay) => ({
			url: relay.url,
			read: relay.read,
			write: relay.write
		}))
	);
}

dispose(): void {
	this.rxNostr.dispose();
}
}
function normalizeFilters(
	filters: Filter | readonly Filter[]
): Filter[] {
	if (isFilterArray(filters)) {
		return [...filters];
	}

	return [filters];
}

function isFilterArray(
	filters: Filter | readonly Filter[]
): filters is readonly Filter[] {
	return Array.isArray(filters);
}
