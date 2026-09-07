import {
	createHash
} from 'node:crypto';

import {
	mkdir,
	rm,
	writeFile
} from 'node:fs/promises';

import {
	dirname,
	join,
	relative
} from 'node:path';


export async function reconstructResources({
	resources,
	events,
	sourceRoot,
	outputRoot
}) {
	await rm(
		outputRoot,
		{
			recursive:
				true,
			force:
				true
		}
	);

	const eventsByD =
		indexEventsByD(
			events
		);

	const errors = [];
	let reconstructedCount =
		0;

	for (
		const resource
		of resources
	) {
		try {
			const matches =
				eventsByD.get(
					resource.d
				) ?? [];

			if (
				matches.length !== 1
			) {
				throw new Error(
					`Expected exactly one relay event, found ${matches.length}.`
				);
			}

			const event =
				matches[0];

			const representation =
				getTag(
					event.tags,
					'representation'
				);

			if (
				representation !==
					resource.representation
			) {
				throw new Error(
					`Representation mismatch: expected "${resource.representation}", got "${representation}".`
				);
			}

			const bytes =
				resource.representation ===
					'content'
					? reconstructContent(
						resource,
						event
					)
					: await reconstructDescriptor(
						resource,
						event
					);

			const relativePath =
				relative(
					sourceRoot,
					resource.sourcePath
				);

			if (
				relativePath.startsWith(
					'..'
				)
			) {
				throw new Error(
					`Source path escaped source root: ${resource.sourcePath}`
				);
			}

			const outputPath =
				join(
					outputRoot,
					relativePath
				);

			await mkdir(
				dirname(
					outputPath
				),
				{
					recursive:
						true
				}
			);

			await writeFile(
				outputPath,
				bytes
			);

			reconstructedCount +=
				1;
		}
		catch (
			error
		) {
			errors.push({
				phase:
					'resource',
				subject:
					resource.d,
				message:
					errorMessage(
						error
					)
			});
		}
	}

	return {
		resourceCount:
			resources.length,
		reconstructedCount,
		errors
	};
}


export function verifyCollections({
	collections,
	events
}) {
	const eventsByD =
		indexEventsByD(
			events
		);

	const errors = [];
	let verifiedCount =
		0;

	for (
		const collection
		of collections
	) {
		try {
			const matches =
				eventsByD.get(
					collection.d
				) ?? [];

			if (
				matches.length !== 1
			) {
				throw new Error(
					`Expected exactly one Collection event, found ${matches.length}.`
				);
			}

			const representation =
				getTag(
					matches[0].tags,
					'representation'
				);

			if (
				representation !==
					collection.representation
			) {
				throw new Error(
					`Representation mismatch: expected "${collection.representation}", got "${representation}".`
				);
			}

			verifiedCount +=
				1;
		}
		catch (
			error
		) {
			errors.push({
				phase:
					'collection',
				subject:
					collection.d,
				message:
					errorMessage(
						error
					)
			});
		}
	}

	return {
		collectionCount:
			collections.length,
		verifiedCount,
		errors
	};
}


function reconstructContent(
	resource,
	event
) {
	requireExactEncoding(
		resource.eventEncoding,
		[
			'hex'
		],
		`Content Resource d="${resource.d}"`
	);

	return decodeHex(
		event.content,
		`Content Resource d="${resource.d}"`
	);
}


async function reconstructDescriptor(
	resource,
	event
) {
	if (
		!resource.hasObjectUpload
	) {
		throw new Error(
			'Descriptor Resource does not have object-upload.'
		);
	}

	requireExactEncoding(
		resource.eventEncoding,
		[
			'hex'
		],
		`Descriptor Resource d="${resource.d}" event`
	);

	requireExactEncoding(
		resource.objectEncoding,
		[],
		`Descriptor Resource d="${resource.d}" object-upload`
	);

	const descriptorDocument =
		decodeHex(
			event.content,
			`Descriptor Resource d="${resource.d}"`
		).toString(
			'utf8'
		);

	let descriptors;

	try {
		descriptors =
			JSON.parse(
				descriptorDocument
			);
	}
	catch (
		error
	) {
		throw new Error(
			`Descriptor document is not valid JSON: ${errorMessage(error)}`
		);
	}

	if (
		!Array.isArray(
			descriptors
		)
	) {
		throw new Error(
			'Descriptor document is not an array.'
		);
	}

	const matches =
		descriptors.filter(
			descriptor =>
				descriptor?.metadata?.resourceId ===
					resource.d
		);

	if (
		matches.length !== 1
	) {
		throw new Error(
			`Expected exactly one ResourceDescriptor, found ${matches.length}.`
		);
	}

	const descriptor =
		matches[0];

	if (
		descriptor.strategy?.type !==
			'blossom'
	) {
		throw new Error(
			`Expected Blossom strategy, got "${descriptor.strategy?.type}".`
		);
	}

	const strategyData =
		descriptor.strategy.data;

	const urls =
		Array.isArray(
			strategyData?.urls
		)
			? strategyData.urls
			: typeof strategyData?.url ===
				'string'
				? [
					strategyData.url
				]
				: [];

	if (
		urls.length === 0
	) {
		throw new Error(
			'Blossom descriptor has no URLs.'
		);
	}

	const bytes =
		await downloadFirstAvailable(
			urls,
			resource.d
		);

	if (
		typeof strategyData.sha256 ===
			'string'
	) {
		const actualSha256 =
			sha256(
				bytes
			);

		if (
			actualSha256 !==
				strategyData.sha256
		) {
			throw new Error(
				`Downloaded Blossom SHA-256 mismatch: expected ${strategyData.sha256}, got ${actualSha256}.`
			);
		}
	}

	if (
		Number.isInteger(
			strategyData?.size
		) &&
		bytes.length !==
			strategyData.size
	) {
		throw new Error(
			`Downloaded Blossom size mismatch: expected ${strategyData.size}, got ${bytes.length}.`
		);
	}

	return bytes;
}


async function downloadFirstAvailable(
	urls,
	resourceId
) {
	const failures = [];

	for (
		const url
		of urls
	) {
		if (
			typeof url !== 'string'
		) {
			continue;
		}

		try {
			const response =
				await fetch(
					url
				);

			if (
				!response.ok
			) {
				failures.push(
					`${url}: HTTP ${response.status}`
				);

				continue;
			}

			return Buffer.from(
				await response.arrayBuffer()
			);
		}
		catch (
			error
		) {
			failures.push(
				`${url}: ${errorMessage(error)}`
			);
		}
	}

	throw new Error(
		`Unable to download Blossom content for d="${resourceId}": ${failures.join('; ')}`
	);
}


function indexEventsByD(
	events
) {
	const result =
		new Map();

	for (
		const event
		of events
	) {
		const d =
			getTag(
				event.tags,
				'd'
			);

		if (
			d === undefined
		) {
			continue;
		}

		const existing =
			result.get(
				d
			) ?? [];

		existing.push(
			event
		);

		result.set(
			d,
			existing
		);
	}

	return result;
}


function getTag(
	tags,
	name
) {
	return tags?.find(
		tag =>
			Array.isArray(
				tag
			) &&
			tag[0] === name
	)?.[1];
}


function requireExactEncoding(
	actual,
	expected,
	label
) {
	if (
		actual.length !==
			expected.length ||
		actual.some(
			(value, index) =>
				value !==
					expected[index]
		)
	) {
		throw new Error(
			`${label} uses unsupported encoding [${actual.join(', ')}]. Expected [${expected.join(', ')}] for byte-for-byte round-trip verification.`
		);
	}
}


function decodeHex(
	value,
	label
) {
	if (
		typeof value !== 'string' ||
		value.length % 2 !== 0 ||
		!/^[0-9a-fA-F]*$/.test(
			value
		)
	) {
		throw new Error(
			`${label} content is not valid hex.`
		);
	}

	return Buffer.from(
		value,
		'hex'
	);
}


function sha256(
	bytes
) {
	return createHash(
		'sha256'
	)
		.update(
			bytes
		)
		.digest(
			'hex'
		);
}


function errorMessage(
	error
) {
	return error instanceof Error
		? error.message
		: String(
			error
		);
}
