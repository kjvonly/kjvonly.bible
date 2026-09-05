import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Manifest
} from '../domain/manifest.js';

import {
	PublicationPreflight
} from './publication-preflight.js';


interface NostrPreflightData {
	readonly relays:
		readonly string[];
}


function createManifest() {

	return {
		version:
			1,

		kind:
			37770,

		staging: {
			path:
				'./.kjvonly'
		},

		nostr: {
			relays: [
				'wss://relay-a.example',
				'wss://relay-b.example'
			]
		},

		strategies: {
			primary: {
				type:
					'blossom',

				urls: [
					'https://blossom-a.example',
					'https://blossom-b.example'
				]
			}
		},

		resources:
			{},

		collections:
			{}
	} satisfies Manifest;
}


describe(
	'PublicationPreflight',
	() => {

		it(
			'checks every required preflight configuration',
			async () => {

				const manifest =
					createManifest();


				const nostrCheck =
					vi.fn(
						async () => {}
					);


				const blossomCheck =
					vi.fn(
						async () => {}
					);


				const preflight =
					new PublicationPreflight(
						{
							check:
								nostrCheck
						},

						{
							check:
								blossomCheck
						}
					);


				await preflight.check(
					manifest
				);


				expect(
					nostrCheck
				).toHaveBeenCalledTimes(
					1
				);


				expect(
					nostrCheck
				).toHaveBeenCalledWith(
					manifest.nostr
				);


				expect(
					blossomCheck
				).toHaveBeenCalledTimes(
					1
				);


				expect(
					blossomCheck
				).toHaveBeenCalledWith(
					manifest
						.strategies
						.primary
				);
			}
		);


		it(
			'fails when any required endpoint fails',
			async () => {

				const preflight =
					new PublicationPreflight(
						{
							check:
								async data => {

									const config =
										data as NostrPreflightData;


									if (
										config.relays.includes(
											'wss://relay-b.example'
										)
									) {
										throw new Error(
											'wss://relay-b.example offline'
										);
									}
								}
						},

						{
							check:
								async () => {}
						}
					);


				await expect(
					preflight.check(
						createManifest()
					)
				).rejects.toThrow(
					'wss://relay-b.example'
				);
			}
		);
	}
);