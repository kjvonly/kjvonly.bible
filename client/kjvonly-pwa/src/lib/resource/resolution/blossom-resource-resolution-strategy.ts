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
	readonly urls:
	string[];

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
			Response | undefined;

		let lastError: unknown;

		for (const url of data.urls) {
			try {
				const result =
					await this.fetcher(
						url
					);

				if (!result.ok) {
					lastError =
						new Error(
							`Blossom returned HTTP ${result.status}.`
						);

					continue;
				}

				response =
					result;

				break;
			} catch (error) {
				lastError =
					error;
			}
		}

		if (!response) {
			throw new Error(
				`Blossom retrieval failed.`,
				{
					cause:
						lastError
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

	const urls =
		value.urls;

	if (
		!Array.isArray(
			urls
		) ||
		urls.length ===
		0 ||
		!urls.every(
			(url) =>
				typeof url ===
					'string' &&
				url.length >
					0 &&
				isValidUrl(
					url
				)
		)
	) {
		throw new Error(
			'Invalid Blossom strategy URLs.'
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
		urls,
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