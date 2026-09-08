import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

import {
	sha256
} from '@noble/hashes/sha2.js';

import {
	bytesToHex
} from '@noble/hashes/utils.js';

interface BlossomStrategyData {
	readonly url:
	string;

	readonly sha256:
	string;

	readonly size?:
	number;
}

export class BlossomResourceResolutionStrategy
	implements ResourceResolutionStrategy {

	readonly type =
		'blossom';

	constructor(
		private readonly fetcher:
			(
				url: string
			) => Promise<Response> =
			globalThis.fetch.bind(
				globalThis
			)
	) { }

	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		Uint8Array
	> {
		const data =
			validateStrategyData(
				descriptor.strategy.data
			);

		let response:
			Response;

		try {
			response =
				await this.fetcher(
					data.url
				);
		} catch (error) {
			throw new Error(
				'Blossom retrieval failed.',
				{
					cause:
						error
				}
			);
		}

		if (
			response.status ===
			404
		) {
			throw new Error(
				'Blossom Resource not found.'
			);
		}

		if (
			!response.ok
		) {
			throw new Error(
				`Blossom retrieval failed: HTTP ${response.status}.`
			);
		}

		const content =
			new Uint8Array(
				await response.arrayBuffer()
			);

		if (
			data.size !==
			undefined &&
			content.byteLength !==
			data.size
		) {
			throw new Error(
				'Blossom content size mismatch.'
			);
		}

		const sha256 =
			await calculateSha256(
				content
			);

		if (
			sha256 !==
			data.sha256
		) {
			throw new Error(
				'Blossom content integrity check failed.'
			);
		}

		return content;
	}
}

function validateStrategyData(
	value: unknown
): BlossomStrategyData {

	if (!isObject(value)) {
		throw new Error(
			'Invalid Blossom strategy data.'
		);
	}

	const url =
		value.url;

	if (
		typeof url !==
		'string' ||
		url.length ===
		0 ||
		!isValidUrl(
			url
		)
	) {
		throw new Error(
			'Invalid Blossom strategy URL.'
		);
	}

	const sha256 =
		value.sha256;

	if (
		typeof sha256 !==
		'string' ||
		!/^[0-9a-f]{64}$/.test(
			sha256
		)
	) {
		throw new Error(
			'Invalid Blossom strategy sha256.'
		);
	}

	const size =
		value.size;

	if (
		size !==
		undefined &&
		(
			typeof size !==
			'number' ||
			!Number.isSafeInteger(
				size
			) ||
			size < 0
		)
	) {
		throw new Error(
			'Invalid Blossom strategy size.'
		);
	}

	return {
		url,
		sha256,
		size
	};
}

function isValidUrl(
	value: string
): boolean {

	try {
		const url =
			new URL(
				value
			);

		return (
			url.protocol ===
			'https:' ||
			url.protocol ===
			'http:'
		);
	} catch {
		return false;
	}
}

function calculateSha256(
	content:
		Uint8Array
): string {

	return bytesToHex(
		sha256(
			content
		)
	);
}

function isObject(
	value: unknown
): value is Record<string, unknown> {

	return (
		typeof value ===
		'object' &&
		value !== null &&
		!Array.isArray(
			value
		)
	);
}