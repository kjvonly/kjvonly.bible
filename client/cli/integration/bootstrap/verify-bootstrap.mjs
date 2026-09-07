#!/usr/bin/env node

import {
	fileURLToPath
} from 'node:url';

import {
	dirname,
	resolve
} from 'node:path';

import {
	comparePublicationTrees
} from './lib/compare.mjs';

import {
	loadPublicationManifest
} from './lib/manifest.mjs';

import {
	queryEventsByKind
} from './lib/relay.mjs';

import {
	reconstructResources,
	verifyCollections
} from './lib/reconstruct.mjs';


const scriptDirectory =
	dirname(
		fileURLToPath(
			import.meta.url
		)
	);

const cliRoot =
	resolve(
		scriptDirectory,
		'../..'
	);

const outputRoot =
	resolve(
		cliRoot,
		'.tmp/bootstrap/downloaded'
	);


async function main() {
	const manifestPath =
		process.argv[2];

	if (
		manifestPath === undefined
	) {
		throw new Error(
			'Usage: node integration/bootstrap/verify-bootstrap.mjs <manifest.yaml>'
		);
	}

	const publication =
		await loadPublicationManifest(
			manifestPath
		);

	console.log(
		`Manifest: ${publication.manifestPath}`
	);
	console.log(
		`Relay:    ${publication.relayUrl}`
	);
	console.log(
		`Kind:     ${publication.kind}`
	);
	console.log(
		`Sources:  ${publication.resources.length}`
	);

	const events =
		await queryEventsByKind({
			relayUrl:
				publication.relayUrl,
			kind:
				publication.kind
		});

	console.log(
		`Events:   ${events.length}`
	);

	const collectionResult =
		verifyCollections({
			collections:
				publication.collections,
			events
		});

	const reconstructionResult =
		await reconstructResources({
			resources:
				publication.resources,
			events,
			sourceRoot:
				publication.sourceRoot,
			outputRoot
		});

	const comparisonResult =
		await comparePublicationTrees({
			resources:
				publication.resources,
			sourceRoot:
				publication.sourceRoot,
			outputRoot
		});

	const errors = [
		...collectionResult.errors,
		...reconstructionResult.errors,
		...comparisonResult.errors
	];

	console.log('');
	console.log('Verification summary');
	console.log(
		`  Collections: ${collectionResult.verifiedCount}/${collectionResult.collectionCount}`
	);
	console.log(
		`  Resources:   ${reconstructionResult.reconstructedCount}/${reconstructionResult.resourceCount}`
	);
	console.log(
		`  Files:       ${comparisonResult.matchedCount}/${comparisonResult.expectedFileCount} SHA-256 matches`
	);
	console.log(
		`  Downloaded:  ${outputRoot}`
	);

	if (
		errors.length > 0
	) {
		console.error('');
		console.error(
			`Verification errors (${errors.length})`
		);

		for (
			const error
			of errors
		) {
			console.error('');
			console.error(
				`[${error.phase}] ${error.subject}`
			);

			for (
				const line
				of error.message.split(
					'\n'
				)
			) {
				console.error(
					`  ${line}`
				);
			}
		}

		console.error('');
		console.error(
			`FAIL: ${errors.length} verification error${errors.length === 1
				? ''
				: 's'}.`
		);

		process.exitCode =
			1;

		return;
	}

	console.log('');
	console.log(
		`PASS: ${comparisonResult.matchedCount}/${comparisonResult.expectedFileCount} files match by SHA-256.`
	);
}


main().catch(
	error => {
		console.error(
			`FAIL: ${error instanceof Error
				? error.message
				: String(error)}`
		);

		process.exitCode =
			1;
	}
);
