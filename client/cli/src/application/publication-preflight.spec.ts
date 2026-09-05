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
			'checks every required endpoint',
			async () => {

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
					createManifest()
				);


				expect(
					nostrCheck
				).toHaveBeenCalledTimes(
					2
				);


				expect(
					blossomCheck
				).toHaveBeenCalledTimes(
					2
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
								async url => {

									if (
										url ===
											'wss://relay-b.example'
									) {
										throw new Error(
											'offline'
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