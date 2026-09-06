import type {
	Logger
} from '../../ports/logger.js';


export class ConsoleLogger
	implements Logger {

	constructor(
		private readonly verboseEnabled:
			boolean
	) {}


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
			`[verbose] ${event}`,
			context
		);
	}
}