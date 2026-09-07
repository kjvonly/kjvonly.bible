import {
	createHash
} from 'node:crypto';

import {
	readdir,
	readFile
} from 'node:fs/promises';

import {
	join,
	relative
} from 'node:path';


export async function comparePublicationTrees({
	resources,
	sourceRoot,
	outputRoot
}) {
	const expectedPaths =
		resources
			.map(
				resource =>
					relative(
						sourceRoot,
						resource.sourcePath
					)
			)
			.sort();

	const downloadedPaths =
		(
			await listFiles(
				outputRoot
			)
		)
			.sort();

	const expectedSet =
		new Set(
			expectedPaths
		);

	const downloadedSet =
		new Set(
			downloadedPaths
		);

	const missing =
		expectedPaths.filter(
			path =>
				!downloadedSet.has(
					path
				)
		);

	const extra =
		downloadedPaths.filter(
			path =>
				!expectedSet.has(
					path
				)
		);

	const mismatches = [];
	let matchedCount =
		0;

	for (
		const path
		of expectedPaths
	) {
		if (
			!downloadedSet.has(
				path
			)
		) {
			continue;
		}

		const sourceSha256 =
			await sha256File(
				join(
					sourceRoot,
					path
				)
			);

		const downloadedSha256 =
			await sha256File(
				join(
					outputRoot,
					path
				)
			);

		if (
			sourceSha256 !==
				downloadedSha256
		) {
			mismatches.push({
				path,
				sourceSha256,
				downloadedSha256
			});

			continue;
		}

		matchedCount +=
			1;
	}

	const errors = [
		...missing.map(
			path => ({
				phase:
					'file',
				subject:
					path,
				message:
					'Missing downloaded file.'
			})
		),
		...extra.map(
			path => ({
				phase:
					'file',
				subject:
					path,
				message:
					'Unexpected downloaded file.'
			})
		),
		...mismatches.map(
			mismatch => ({
				phase:
					'file',
				subject:
					mismatch.path,
				message:
					[
						'SHA-256 mismatch.',
						`source:     ${mismatch.sourceSha256}`,
						`downloaded: ${mismatch.downloadedSha256}`
					].join(
						'\n'
					)
			})
		)
	];

	return {
		expectedFileCount:
			expectedPaths.length,
		downloadedFileCount:
			downloadedPaths.length,
		matchedCount,
		missing,
		extra,
		mismatches,
		errors
	};
}


async function listFiles(
	root
) {
	const result = [];

	async function walk(
		directory
	) {
		let entries;

		try {
			entries =
				await readdir(
					directory,
					{
						withFileTypes:
							true
					}
				);
		}
		catch (
			error
		) {
			if (
				error?.code ===
					'ENOENT'
			) {
				return;
			}

			throw error;
		}

		for (
			const entry
			of entries
		) {
			const path =
				join(
					directory,
					entry.name
				);

			if (
				entry.isDirectory()
			) {
				await walk(
					path
				);

				continue;
			}

			if (
				entry.isFile()
			) {
				result.push(
					relative(
						root,
						path
					)
				);
			}
		}
	}

	await walk(
		root
	);

	return result;
}


async function sha256File(
	path
) {
	return createHash(
		'sha256'
	)
		.update(
			await readFile(
				path
			)
		)
		.digest(
			'hex'
		);
}
