#!/usr/bin/env node

import {
	createCliComposition
} from './composition/create-cli-composition.js';


async function main(): Promise<void> {

	const {
		cli
	} = createCliComposition();


	try {
		await cli.parseAsync(
			process.argv
		);
	}
	catch (
		error:
			unknown
	) {
		if (
			error
				instanceof Error
		) {
			console.error(
				error.message
			);
		}
		else {
			console.error(
				'Unknown CLI failure.'
			);
		}


		process.exitCode = 1;
	}
}


await main();