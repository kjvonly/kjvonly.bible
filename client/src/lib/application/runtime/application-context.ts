import {
	getContext,
	setContext
} from 'svelte';

import type {
	ResourceClient
} from '$lib/resource/nostr/resource-client';

import type {
	NostrSigner
} from '$lib/infrastructure/nostr/nostr-signer';

export interface ApplicationContext {
	readonly nostrSigner:
		NostrSigner;

	readonly resourceClient:
		ResourceClient;
}

const APPLICATION_CONTEXT =
	Symbol(
		'kjvonly.application-context'
	);

export function provideApplicationContext(
	context: ApplicationContext
): void {
	setContext(
		APPLICATION_CONTEXT,
		context
	);
}

export function useApplicationContext():
	ApplicationContext {

	const context =
		getContext<
			ApplicationContext |
			undefined
		>(
			APPLICATION_CONTEXT
		);

	if (context === undefined) {
		throw new Error(
			'Application context is not available.'
		);
	}

	return context;
}