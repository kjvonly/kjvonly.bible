import type {
	NostrRelay
} from '$lib/infrastructure/nostr/client/nostr-client';

export interface ApplicationConfig {
	readonly resourceRelays:
		readonly NostrRelay[];

	readonly accountBootstrapRelays:
		readonly NostrRelay[];
}

export function createApplicationConfig():
	ApplicationConfig {

	const relayValue =
		import.meta.env
			.VITE_NOSTR_COMMA_DELIMITED_RELAY_URLS;

	return {
		resourceRelays:
			parseRelays(
				relayValue
			),

		accountBootstrapRelays:
			parseRelays(
				relayValue
			)
	};
}

function parseRelays(
	value: string | undefined
): NostrRelay[] {
	if (!value) {
		return [];
	}

	return value
		.split(',')
		.map(
			(url) =>
				url.trim()
		)
		.filter(
			(url) =>
				url.length > 0
		)
		.map(
			(url) => ({
				url,
				read: true,
				write: true
			})
		);
}