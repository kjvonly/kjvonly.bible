import { BibleDB, bibleDB } from '$lib/storer/bible.db';
import { BASE_URL } from '../utils/paths';

const myHeaders = new Headers();
myHeaders.append('Content-Type', 'application/json');
myHeaders.append('Transfer-Encoding', 'gzip');

async function onChapters() {
	let db = await new BibleDB();

	fetch(`${BASE_URL}/data/json.gz/all.json`, {
		headers: myHeaders
	})
		.then((res) => {
			res.json().then((json) => {
				let myMap = new Map<string, any>(Object.entries(json));
				myMap.forEach((value: any, key: string) => {
					value['id'] = key;
					db.putValue('chapters', value);
				});
			});
		})
		.catch((err) => {
			console.log(`error: ${err}`);
		});
}

async function onBooknames() {
	let db = await new BibleDB();
	fetch(`${BASE_URL}/data/json.gz/booknames.json`, {
		headers: myHeaders
	})
		.then((res) => {
			res.json().then((json) => {
				json['id'] = 'booknames';
				db.putValue('booknames', json);
			});
		})
		.catch((err) => {
			console.log(`error: ${err}`);
		});
}

async function onSearch() {
	let db = await new BibleDB();
	fetch(`${BASE_URL}/data/json.gz/bibleindex.json`, {
		headers: myHeaders
	})
		.then((res) => {
			res.json().then((json) => {
				db.putValue('search', json);
			});
		})
		.catch((err) => {
			console.log(`error: ${err}`);
		});
}

async function onStrongs() {
	let db = await new BibleDB();
	fetch(`${BASE_URL}/data/strongs.json.gz/all.json`, {
		headers: myHeaders
	})
		.then((res) => {
			res.json().then((json) => {
				let myMap = new Map<string, any>(Object.entries(json));
				myMap.forEach((value: any, key: string) => {
					value['id'] = key;
					db.putValue('strongs', value);
				});
			});
		})
		.catch((err) => {
			console.log(`error: ${err}`);
		});
}

onmessage = async (e) => {
	switch (e.data.sync) {
		case 'chapters':
			onChapters();
			break;
		case 'booknames':
			onBooknames();
			break;
		case 'strongs':
			onStrongs();
			break;
		case 'search':
			onSearch();
	}
};
