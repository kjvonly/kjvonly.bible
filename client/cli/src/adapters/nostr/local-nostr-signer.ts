import {
	finalizeEvent,
	getPublicKey
} from 'nostr-tools/pure';

import {
	nip19
} from 'nostr-tools';

import type {
	SignedNostrEvent,
	UnsignedNostrEvent
} from '../../domain/nostr-event.js';

import type {
	EventSigner
} from '../../ports/event-signer.js';


export class LocalNostrSigner
	implements EventSigner {

	private secretKey?:
		Uint8Array;


	constructor(
		private readonly configuredSecretKey:
			string |
				undefined
	) {}


	async getPublicKey():
		Promise<string> {

		return getPublicKey(
			this.getSecretKey()
		);
	}


	async sign(
		event:
			UnsignedNostrEvent
	): Promise<
		SignedNostrEvent
	> {

		return finalizeEvent(
			{
				kind:
					event.kind,

				created_at:
					event.created_at,

				tags:
					event.tags.map(
						tag => [
							...tag
						]
					),

				content:
					event.content
			},
			this.getSecretKey()
		);
	}


	private getSecretKey():
		Uint8Array {

		if (
			this.secretKey !==
				undefined
		) {
			return this.secretKey;
		}


		const configured =
			this.configuredSecretKey;


		if (
			configured ===
				undefined ||
			configured.length ===
				0
		) {
			throw new Error(
				'NOSTR_SECRET_KEY is required.'
			);
		}


		this.secretKey =
			this.decodeSecretKey(
				configured
			);


		return this.secretKey;
	}


	private decodeSecretKey(
		value:
			string
	): Uint8Array {

		if (
			/^[0-9a-fA-F]{64}$/
				.test(
					value
				)
		) {
			return Uint8Array.from(
				Buffer.from(
					value,
					'hex'
				)
			);
		}


		if (
			value.startsWith(
				'nsec1'
			)
		) {
			try {
				const decoded =
					nip19.decode(
						value
					);


				if (
					decoded.type ===
						'nsec' &&
					decoded.data
						instanceof Uint8Array
				) {
					return decoded.data;
				}
			}
			catch {
				throw new Error(
					'NOSTR_SECRET_KEY is invalid.'
				);
			}
		}


		throw new Error(
			'NOSTR_SECRET_KEY is invalid.'
		);
	}
}