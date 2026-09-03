import type {
	ResourceRelay
} from '$lib/resource/nostr/resource-client';

export interface ApplicationConfig {
	readonly resourceRelays:
		readonly ResourceRelay[];
}

export function createApplicationConfig():
	ApplicationConfig {

	return {
		resourceRelays:
			parseRelays(
				import.meta.env
					.VITE_NOSTR_COMMA_DELIMITED_RELAY_URLS
			)
	};
}

function parseRelays(
	value: string | undefined
): ResourceRelay[] {
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