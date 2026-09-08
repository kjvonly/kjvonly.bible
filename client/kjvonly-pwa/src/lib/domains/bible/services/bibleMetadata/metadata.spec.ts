import { it } from 'vitest';

import bcvcByID from './json/booksChaptersVerseCountByID.json';
import data from './json/bookIDByBookNames.json';

function sort(a: string, b: string): number {
	return parseInt(a) - parseInt(b);
}

it('print map of maps of books chapters verse count', () => {
	let d = JSON.parse(JSON.stringify(bcvcByID));

	console.log(`new Map([`);
	for (let bookID of Object.keys(d).sort(sort)) {
		console.log(`[ "${bookID}", new Map([`);
		for (let chapter of Object.keys(d[bookID]).sort(sort)) {
			console.log(`["${chapter}", "${d[bookID][chapter]}"],`);
		}
		console.log('])],');
	}
	console.log(`])`);
});

it('should output bookIDByBookName in order', () => {
	let d = JSON.parse(JSON.stringify(data));
	console.log(`new Map([`);
	for (let bookName of Object.keys(d).sort((a, b) => sort(d[a], d[b]))) {
		console.log(`["${bookName}", "${d[bookName]}"],`);
	}
	console.log(`])`);
});
