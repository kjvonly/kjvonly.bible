import {
	readdir,
	readFile,
	stat
} from 'node:fs/promises';

import {
	basename,
	dirname,
	isAbsolute,
	parse as parsePath,
	resolve,
	sep
} from 'node:path';

import {
	parse
} from 'yaml';


export async function loadPublicationManifest(
	manifestPath
) {
	const absoluteManifestPath =
		resolve(
			manifestPath
		);

	const manifestDirectory =
		dirname(
			absoluteManifestPath
		);

	const manifest =
		parse(
			await readFile(
				absoluteManifestPath,
				'utf8'
			)
		);

	if (
		manifest === null ||
		typeof manifest !== 'object'
	) {
		throw new Error(
			`Manifest is not an object: ${absoluteManifestPath}`
		);
	}

	if (
		!Number.isInteger(
			manifest.kind
		)
	) {
		throw new Error(
			'Manifest kind is required.'
		);
	}

	const relayUrl =
		manifest.nostr?.relays?.[0];

	if (
		typeof relayUrl !== 'string' ||
		relayUrl.length === 0
	) {
		throw new Error(
			'Manifest must define at least one Nostr relay.'
		);
	}

	const resources =
		await expandResources({
			manifest,
			manifestDirectory
		});

	if (
		resources.length === 0
	) {
		throw new Error(
			'Manifest did not expand to any Resource source files.'
		);
	}

	const sourceRoot =
		commonDirectory(
			resources.map(
				resource =>
					resource.sourcePath
			)
		);

	const collections =
		expandCollections(
			manifest.collections ?? {}
		);

	return {
		manifestPath:
			absoluteManifestPath,
		kind:
			manifest.kind,
		relayUrl,
		resources,
		collections,
		sourceRoot
	};
}


async function expandResources({
	manifest,
	manifestDirectory
}) {
	const resources = [];

	for (
		const [
			resourceName,
			resource
		]
		of Object.entries(
			manifest.resources ?? {}
		)
	) {
		if (
			typeof resource?.path !== 'string'
		) {
			throw new Error(
				`Resource "${resourceName}" is missing path.`
			);
		}

		const sourcePath =
			resolveManifestPath(
				manifestDirectory,
				resource.path
			);

		const sourceStat =
			await stat(
				sourcePath
			);

		const dTemplate =
			requireTag(
				resource.event?.tags,
				'd',
				`Resource "${resourceName}"`
			);

		const representation =
			requireTag(
				resource.event?.tags,
				'representation',
				`Resource "${resourceName}"`
			);

		if (
			representation !== 'content' &&
			representation !== 'descriptors'
		) {
			throw new Error(
				`Resource "${resourceName}" has unsupported representation "${representation}".`
			);
		}

		const eventEncoding =
			resource.event?.encoding ?? [];

		const objectEncoding =
			resource['object-upload']?.encoding ?? [];

		if (
			sourceStat.isFile()
		) {
			resources.push(
				createConcreteResource({
					resourceName,
					resource,
					sourcePath,
					dTemplate,
					representation,
					eventEncoding,
					objectEncoding
				})
			);

			continue;
		}

		if (
			!sourceStat.isDirectory()
		) {
			throw new Error(
				`Resource "${resourceName}" path is neither a file nor directory: ${sourcePath}`
			);
		}

		const entries =
			(
				await readdir(
					sourcePath,
					{
						withFileTypes:
							true
					}
				)
			)
				.filter(
					entry =>
						entry.isFile() &&
						!entry.name.startsWith('.')
				)
				.sort(
					(left, right) =>
						left.name.localeCompare(
							right.name
						)
				);

		for (
			const entry
			of entries
		) {
			resources.push(
				createConcreteResource({
					resourceName,
					resource,
					sourcePath:
						resolve(
							sourcePath,
							entry.name
						),
					dTemplate,
					representation,
					eventEncoding,
					objectEncoding
				})
			);
		}
	}

	return resources;
}


function createConcreteResource({
	resourceName,
	resource,
	sourcePath,
	dTemplate,
	representation,
	eventEncoding,
	objectEncoding
}) {
	const key =
		deriveKey(
			sourcePath
		);

	return {
		resourceName,
		sourcePath,
		key,
		d:
			dTemplate.replaceAll(
				'${key}',
				key
			),
		representation,
		eventEncoding:
			[...eventEncoding],
		objectEncoding:
			[...objectEncoding],
		hasObjectUpload:
			resource['object-upload'] !==
				undefined
	};
}


function expandCollections(
	collections
) {
	return Object.entries(
		collections
	).map(
		([
			collectionName,
			collection
		]) => ({
			collectionName,
			d:
				requireTag(
					collection.event?.tags,
					'd',
					`Collection "${collectionName}"`
				),
			representation:
				requireTag(
					collection.event?.tags,
					'representation',
					`Collection "${collectionName}"`
				)
		}));
}


function requireTag(
	tags,
	name,
	owner
) {
	const matches =
		(tags ?? []).filter(
			tag =>
				Array.isArray(
					tag
				) &&
				tag[0] === name
		);

	if (
		matches.length !== 1 ||
		typeof matches[0][1] !== 'string'
	) {
		throw new Error(
			`${owner} must contain exactly one "${name}" tag.`
		);
	}

	return matches[0][1];
}


function resolveManifestPath(
	manifestDirectory,
	value
) {
	return isAbsolute(
		value
	)
		? value
		: resolve(
			manifestDirectory,
			value
		);
}


function deriveKey(
	filePath
) {
	return basename(
		filePath
	).split('.')[0];
}


function commonDirectory(
	filePaths
) {
	const directories =
		filePaths.map(
			filePath =>
				dirname(
					resolve(
						filePath
					)
				)
		);

	const roots =
		directories.map(
			directory =>
				parsePath(
					directory
				).root
		);

	if (
		new Set(
			roots
		).size !== 1
	) {
		throw new Error(
			'Resource source files do not share a filesystem root.'
		);
	}

	const root =
		roots[0];

	const segments =
		directories.map(
			directory =>
				directory
					.slice(
						root.length
					)
					.split(
						sep
					)
					.filter(
						Boolean
					)
		);

	const common = [];
	const shortest =
		Math.min(
			...segments.map(
				parts =>
					parts.length
			)
		);

	for (
		let index = 0;
		index < shortest;
		index += 1
	) {
		const value =
			segments[0][index];

		if (
			segments.some(
				parts =>
					parts[index] !== value
			)
		) {
			break;
		}

		common.push(
			value
		);
	}

	return resolve(
		root,
		...common
	);
}
