import {
	describe,
	expect,
	it
} from 'vitest';

describe(
	'browser test environment',
	() => {
		it(
			'runs inside a real browser',
			() => {
				expect(
					typeof window
				).toBe(
					'object'
				);

				expect(
					typeof document
				).toBe(
					'object'
				);
			}
		);

		it(
			'provides the browser APIs required by Nostr infrastructure',
			() => {
				expect(
					typeof Worker
				).toBe(
					'function'
				);

				expect(
					typeof WebSocket
				).toBe(
					'function'
				);

				expect(
					typeof crypto
				).toBe(
					'object'
				);
			}
		);

		it(
			'can execute and communicate with a real Web Worker',
			async () => {
				const worker =
					new Worker(
						new URL(
							'./smoke.worker.js',
							import.meta.url
						),
						{
							type:
								'module'
						}
					);

				try {
					const response =
						await new Promise<string>(
							(
								resolve,
								reject
							) => {
								const timeout =
									setTimeout(
										() => {
											reject(
												new Error(
													'Worker did not respond.'
												)
											);
										},
										5_000
									);

								worker.onmessage =
									(
										event:
											MessageEvent<string>
									) => {
										clearTimeout(
											timeout
										);

										resolve(
											event.data
										);
									};

								worker.onerror =
									(event) => {
										clearTimeout(
											timeout
										);

										reject(
											new Error(
												event.message
											)
										);
									};

								worker.postMessage(
									'ping'
								);
							}
						);

					expect(
						response
					).toBe(
						'worker:ping'
					);
				} finally {
					worker.terminate();
				}
			}
		);
	}
);