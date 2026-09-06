import { Logger } from '../../ports/logger.js';
import type {
	PublicationEndpointPreflight
} from '../../ports/publication-endpoint-preflight.js';


interface BlossomPreflightData {
	readonly type:
	'blossom';

	readonly urls:
	readonly string[];
}


const PREFLIGHT_TIMEOUT_MS =
	5_000;


export class NodeBlossomPreflight
	implements PublicationEndpointPreflight {
	constructor(
		private readonly logger:
			Logger
	) { }

	async check(
		data:
			unknown
	): Promise<void> {

		const config =
			data as BlossomPreflightData;


		await Promise.all(
			config.urls.map(
				async url => {
					this.logCheckStart(
						url
					);

					try {
						await fetch(
							url,
							{
								method:
									'HEAD',

								signal:
									AbortSignal.timeout(
										PREFLIGHT_TIMEOUT_MS
									)
							}
						);
					}
					catch (
					error:
						unknown
					) {
						throw new Error(
							`Unable to reach Blossom server "${url}": ${error instanceof Error
								? error.message
								: String(
									error
								)
							}`
						);
					}

					this.logCheckComplete(
						url
					);
				}
			)
		);
	}

	///////////////////////////////////////////////////////////////////////////
	// Log Helpers

	private logCheckStart(
		url:
			string
	): void {

		this.logger.verbose(
			'preflight.blossom.start',
			{
				url
			}
		);
	}


	private logCheckComplete(
		url:
			string
	): void {

		this.logger.verbose(
			'preflight.blossom.complete',
			{
				url
			}
		);
	}
}