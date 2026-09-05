import type {
	Manifest
} from '../domain/manifest.js';

import type {
	PublicationEndpointPreflight
} from '../ports/publication-endpoint-preflight.js';


export class PublicationPreflight {

	constructor(
		private readonly nostr:
			PublicationEndpointPreflight,

		private readonly blossom:
			PublicationEndpointPreflight
	) {}


	async check(
		manifest:
			Manifest
	): Promise<void> {

		const relays =
			[
				...new Set(
					manifest
						.nostr
						.relays
				)
			];


		const blossomUrls =
			[
				...new Set(
					Object
						.values(
							manifest.strategies
						)
						.flatMap(
							strategy =>
								strategy.type ===
									'blossom'
									? strategy.urls
									: []
						)
				)
			];


		const checks = [
			...relays.map(
				url => ({
					type:
						'Nostr relay',

					url,

					preflight:
						this.nostr
				})
			),

			...blossomUrls.map(
				url => ({
					type:
						'Blossom server',

					url,

					preflight:
						this.blossom
				})
			)
		];


		const results =
			await Promise.allSettled(
				checks.map(
					check =>
						check
							.preflight
							.check(
								check.url
							)
				)
			);


		const failures =
			results.flatMap(
				(
					result,
					index
				) => {

					if (
						result.status ===
							'fulfilled'
					) {
						return [];
					}


					const check =
						checks[
							index
						]!;


					return [
						`${check.type} ${check.url}: ${
							result.reason instanceof Error
								? result.reason.message
								: String(
									result.reason
								)
						}`
					];
				}
			);


		if (
			failures.length >
				0
		) {
			throw new Error(
				[
					'Publication preflight failed:',
					...failures
				].join(
					'\n'
				)
			);
		}
	}
}