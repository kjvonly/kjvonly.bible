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

	async check(
		data:
			unknown
	): Promise<void> {

		const config =
			data as BlossomPreflightData;


		await Promise.all(
			config.urls.map(
				async url => {

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
							`Unable to reach Blossom server "${url}": ${
								error instanceof Error
									? error.message
									: String(
										error
									)
							}`
						);
					}
				}
			)
		);
	}
}