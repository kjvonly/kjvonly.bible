import type {
	Logger
} from '../../ports/logger.js';


export class ConsoleLogger
	implements Logger {

	private verboseEnabled:
		boolean;


	constructor(
		verboseEnabled:
			boolean
	) {

		this.verboseEnabled =
			verboseEnabled;
	}


	setVerboseEnabled(
		enabled:
			boolean
	): void {

		this.verboseEnabled =
			enabled;
	}


	verbose(
	event:
		string,

	context?:
		Readonly<
			Record<
				string,
				unknown
			>
		>
): void {

	if (
		!this.verboseEnabled
	) {
		return;
	}


	if (
		context ===
		undefined
	) {
		console.log(
			`[verbose] ${event}`
		);

		return;
	}


	console.log(
		`[verbose] ${event} ${JSON.stringify(
			context
		)}`
	);
}
}