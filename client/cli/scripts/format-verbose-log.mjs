#!/usr/bin/env node

import readline from 'node:readline';


const verbosePattern =
	/^\[verbose\]\s+(\S+)(?:\s+(.*))?$/;


const blankBeforeEvents =
	new Set([
		'build.start',
		'build.resource.start',
		'collection.build.start',
		'sync.publish.start',
		'publish.start',
		'preflight.start',
		'blossom.publish.start',
		'nostr.publish.start',
		'nostr.relay.start',
		'nostr.event.read'
	]);


function indentationFor(
	event
) {

	if (
		event.startsWith(
			'sync.'
		)
	) {
		return 0;
	}


	if (
		event ===
			'build.start' ||
		event ===
			'build.manifest.loaded' ||
		event ===
			'build.complete' ||
		event ===
			'publish.start' ||
		event ===
			'publish.manifest.loaded' ||
		event ===
			'publish.preflight.complete' ||
		event ===
			'publish.blossom.complete' ||
		event ===
			'publish.nostr.complete' ||
		event ===
			'publish.complete'
	) {
		return 1;
	}


	if (
		event.startsWith(
			'build.resource.'
		) ||
		event.startsWith(
			'collection.'
		) ||
		event.startsWith(
			'preflight.'
		) ||
		event.startsWith(
			'blossom.publish.'
		) ||
		event.startsWith(
			'nostr.publish.'
		)
	) {
		return 2;
	}


	if (
		event.startsWith(
			'descriptor-resource.'
		) ||
		event.startsWith(
			'blossom.artifact.'
		) ||
		event.startsWith(
			'nostr.relay.'
		)
	) {
		return 3;
	}


	if (
		event.startsWith(
			'artifact.'
		) ||
		event.startsWith(
			'nostr.connect.'
		) ||
		event.startsWith(
			'nostr.reconcile.'
		) ||
		event.startsWith(
			'nostr.auth.'
		) ||
		(
			event.startsWith(
				'nostr.event.'
			) &&
			!event.startsWith(
				'nostr.event.transport.'
			)
		)
	) {
		return 4;
	}


	if (
		event.startsWith(
			'negentropy.'
		) ||
		event.startsWith(
			'nostr.event.transport.'
		)
	) {
		return 5;
	}


	return 0;
}


function shouldInsertBlankLine(
	event
) {

	return blankBeforeEvents.has(
		event
	);
}


let hasOutput =
	false;

let lastOutputWasBlank =
	false;


function writeBlankLine() {

	if (
		!hasOutput ||
		lastOutputWasBlank
	) {
		return;
	}


	process.stdout.write(
		'\n'
	);


	lastOutputWasBlank =
		true;
}


function writeLine(
	line
) {

	process.stdout.write(
		`${line}\n`
	);


	hasOutput =
		true;

	lastOutputWasBlank =
		false;
}


const input =
	readline.createInterface({
		input:
			process.stdin,

		crlfDelay:
			Infinity
	});


input.on(
	'line',
	line => {

		const match =
			verbosePattern.exec(
				line
			);


		if (
			match ===
				null
		) {
			writeLine(
				line
			);

			return;
		}


		const event =
			match[1];

		const context =
			match[2];


		if (
			shouldInsertBlankLine(
				event
			)
		) {
			writeBlankLine();
		}


		const indentation =
			'  '.repeat(
				indentationFor(
					event
				)
			);


		writeLine(
			`${indentation}[verbose] ${event}${context === undefined
				? ''
				: ` ${context}`}`
		);
	}
);