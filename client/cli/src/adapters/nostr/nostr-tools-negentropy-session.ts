import {
	nip77
} from 'nostr-tools';

import type {
	Filter
} from 'nostr-tools/filter';

export class NostrToolsNegentropyError
	extends Error {

	constructor(
		readonly reason:
			string
	) {

		super(
			`Relay rejected Negentropy reconciliation: ${reason}`
		);

		this.name =
			'NostrToolsNegentropyError';
	}
}

interface NegentropySubscription {
	readonly id:
	string;

	oncustom?:
	(
		data:
			string[]
	) => void;

	close():
		void;
}


export interface NegentropyRelay {
	prepareSubscription(
		filters:
			Filter[],

		params: {
			readonly label:
			string;
		}
	): NegentropySubscription;


	send(
		message:
			string
	): Promise<void>;
}


export function reconcileNostrToolsNegentropy(
	relay:
		NegentropyRelay,

	storage:
		nip77.NegentropyStorageVector,

	filter:
		Filter
): Promise<
	readonly string[]
> {

	const negentropy =
		new nip77
			.Negentropy(
				storage
			);


	const have =
		new Set<string>();


	const subscription =
		relay.prepareSubscription(
			[
				{}
			],
			{
				label:
					'negentropy'
			}
		);


	return new Promise(
		(
			resolve,
			reject
		) => {

			let settled =
				false;


			const succeed =
				() => {

					if (
						settled
					) {
						return;
					}


					settled =
						true;


					resolve(
						[
							...have
						]
					);
				};


			const fail =
				(
					error:
						unknown
				) => {

					if (
						settled
					) {
						return;
					}


					settled =
						true;


					reject(
						error instanceof Error
							? error
							: new Error(
								String(
									error
								)
							)
					);
				};


			subscription.oncustom =
				data => {

					switch (
					data[0]
					) {
						case 'NEG-MSG': {

							const message =
								data[2];


							if (
								message ===
								undefined
							) {
								fail(
									new Error(
										'Relay returned an invalid NEG-MSG.'
									)
								);


								return;
							}


							try {
								const response =
									negentropy.reconcile(
										message,
										eventId => {

											have.add(
												eventId
											);
										}
									);


								if (
									response !==
									null
								) {
									relay.send(
										JSON.stringify([
											'NEG-MSG',
											subscription.id,
											response
										])
									).catch(
										fail
									);


									return;
								}


								relay.send(
									JSON.stringify([
										'NEG-CLOSE',
										subscription.id
									])
								).then(
									() => {

										subscription.close();


										succeed();
									}
								).catch(
									fail
								);
							}
							catch (
							error:
								unknown
							) {
								fail(
									error
								);
							}


							return;
						}


						case 'NEG-CLOSE': {

							fail(
								new Error(
									`Relay closed Negentropy reconciliation: ${data[2] ?? 'unknown reason'}`
								)
							);


							return;
						}


						case 'NEG-ERR':
						case 'NEG-ERROR': {

							const reason =
								data[2] ??
								'unknown error';


							fail(
								new NostrToolsNegentropyError(
									reason
								)
							);


							return;
						}
					}
				};


			let initialMessage:
				string;


			try {
				initialMessage =
					negentropy.initiate();
			}
			catch (
			error:
				unknown
			) {
				fail(
					error
				);


				return;
			}


			relay.send(
				JSON.stringify([
					'NEG-OPEN',
					subscription.id,
					filter,
					initialMessage
				])
			).catch(
				fail
			);
		}
	);
}