import { base } from '$app/paths';
import IndexedDb from '../db/idb.db';

onmessage = async () => {
	const myHeaders = new Headers();
	myHeaders.append('Content-Type', 'application/json');
	myHeaders.append('Transfer-Encoding', 'gzip');
	let db = new IndexedDb('bible');
	await db.createObjectStore(['chapters']);
	let v = db.getValue('chapters', 'booknames');
	v.then((v) => {
		if (v === undefined) {
			fetch(`${base}/data/json.gz/all.json.gz`).then((res) => {
				res.json().then((json) => {
					let myMap = new Map<string, any>(Object.entries(json));
					myMap.forEach((value: any, key: string) => {
						value['id'] = key;
						db.putValue('chapters', value);
					});
				});
			}).catch((err) => {
				console.log(`error: ${err}`)
			});
			fetch(`${base}/data/json.gz/booknames.json.gz`).then((res) => {
				res.json().then((json) => {
					json['id'] = 'booknames';
					db.putValue('chapters', json);
				});
			}).catch((err) => {
				console.log(`error: ${err}`)
			});;
			fetch(`${base}/data/strongs.json.gz/all.json.gz`).then((res) => {
				res.json().then((json) => {
					let myMap = new Map<string, any>(Object.entries(json));
					myMap.forEach((value: any, key: string) => {
						value['id'] = key;
						db.putValue('chapters', value);
					});
				});
			}).catch((err) => {
				console.log(`error: ${err}`)
			});
		}
	});
};

export { };
