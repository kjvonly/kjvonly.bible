import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	DOMAIN_OBJECTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import  { STRONGS_DEFINITION_OBJECT_TYPE, IndexedDBStrongsStore } from '$lib/domains/strongs/persistence/indexeddb-strongs-store';


describe(
	'IndexedDBStrongsStore',
	() => {
		const ids = [
			'publisher/kjvs/G1',
			'publisher/kjvs/H1',
			'publisher/kjvs/G777'
		];

		afterEach(
			async () => {
				const db =
					await getApplicationDB();

				for (
					const id of ids
				) {
					await db.delete(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							id
						)
					);
				}
			}
		);

		it(
			'stores and retrieves a Strong\'s definition',
			async () => {
				const store =
					new IndexedDBStrongsStore(
						getApplicationDB
					);

				const strongs =
					createStrongs();

				await store.put(
					strongs
				);

				expect(
					await store.get(
						strongs.id
					)
				).toEqual(
					strongs
				);
			}
		);

		it(
			'stores the Domain Object using the Strong\'s definition object type',
			async () => {
				const store =
					new IndexedDBStrongsStore(
						getApplicationDB
					);

				const strongs =
					createStrongs();

				await store.put(
					strongs
				);

				const db =
					await getApplicationDB();

				const stored =
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongs.id
						)
					);

				expect(
					stored
				).toEqual({
					id:
						'strongs/definition:publisher/kjvs/G1',

					objectType:
						'strongs/definition',

					objectId:
						'publisher/kjvs/G1',

					value:
						strongs
				});
			}
		);

		it(
			'returns undefined when a Strong\'s definition is not installed',
			async () => {
				const store =
					new IndexedDBStrongsStore(
						getApplicationDB
					);

				expect(
					await store.get(
						'publisher/kjvs/G777'
					)
				).toBeUndefined();
			}
		);

		it(
			'keeps definitions from different Bible versions distinct',
			async () => {
				const store =
					new IndexedDBStrongsStore(
						getApplicationDB
					);

				const kjvs =
					createStrongs({
						id:
							'publisher/kjvs/G1'
					});

				const hebrew =
					createStrongs({
						id:
							'publisher/kjvs/H1',

						number:
							'H1'
					});

				await store.put(
					kjvs
				);

				await store.put(
					hebrew
				);

				expect(
					await store.get(
						kjvs.id
					)
				).toEqual(
					kjvs
				);

				expect(
					await store.get(
						hebrew.id
					)
				).toEqual(
					hebrew
				);
			}
		);
	}
);

function createStrongs(
	overrides:
		Partial<Strongs> =
			{}
): Strongs {

	return {
		id:
			'publisher/kjvs/G1',

		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null,

		...overrides
	};
}