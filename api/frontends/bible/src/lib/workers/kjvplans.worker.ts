import { chapterApi } from '$lib/api/chapters.api';
import { notesApi } from '$lib/api/notes.api';
import { plansApi } from '$lib/api/plans.api';
import { readingsApi } from '$lib/api/readings.api';
import { subsApi } from '$lib/api/subs.api';
import { bibleDB, PLANS, SEARCH } from '$lib/storer/bible.db';
import { extractBookChapter } from '$lib/utils/chapter';
import { sleep } from '$lib/utils/sleep';
import FlexSearch, { type Id } from 'flexsearch';


async function waitForSearchIndex(): Promise<boolean> {
	while (1) {
		let searchIndex = await bibleDB.getValue(SEARCH, 'v1');
		if (searchIndex) {
			return true;
		}
		await sleep(1000);
	}
	return false;
}

let plansDocument = new FlexSearch.Document({
	document: {
		id: 'id',
		index: []
	}
});

let subDocument = new FlexSearch.Document({
	document: {
		id: 'id',
		index: []
	}
});

let readingsDocument = new FlexSearch.Document({
	document: {
		id: 'id',
		index: ['id', 'subID']
	}
});

let notes: any = {};
let plans: any = {}
let subs: any = {}
let readings: any = {}

let booknames: any = {}

async function init() {
	booknames = await chapterApi.getBooknames()

	let chachedPlans = await plansApi.gets()

	for (let i = 0; i < chachedPlans.length; i++) {
		let p = chachedPlans[i]

		let prs = p.readings
		let bc = []
		// fill in with booknames
		for (let j = 0; j < prs.length; j++) {
			let r = prs[j]
			let rs = r.split(';')

			for (let k = 0; k < rs.length; k++) {
				let bcv = rs[k].split('/')
				let bookName = booknames['booknamesById'][bcv[0]]
				let chapter = bcv[1]
				let verses = bcv[2]
				let reading  = {
					bookName: bookName,
					chapter: chapter,
					verses: verses,
					bcv: bcv
				}
				bc.push(reading)
			}
		}
		p.readings = bc
		console.log(bc)
		await chachedPlans.addAsync(p.id, p);
		plans[p.id] = p
	}


	let cachedSubs = await subsApi.gets()
	for (let i = 0; i < cachedSubs.length; i++) {
		let s = cachedSubs[i]
		await cachedSubs.addAsync(s.id, s);
		subs[s.id] = s
	}

	// CORE NOTE: Reading ids are composite priamry keys subID & id
	// id is just the index in of the reading plan. FlexSearch id 
	// is <subid>/<id> for a reading
	let cachedReadings = await subsApi.gets()
	for (let i = 0; i < cachedReadings.length; i++) {
		let r = cachedReadings[i]
		await cachedReadings.addAsync(`${r.subID}/${r.id}`, r);
		readings[r.id] = r
	}




	chachedPlans.forEach((p: any) => {
		plans[p.id] = p
	});




	let cahcedNotes = await notesApi.gets();
	notes = {};
	for (let i = 0; i < cahcedNotes.length; i++) {
		let nn = cahcedNotes[i];
		if (nn?.chapterKey) {
			let ck = nn.chapterKey.split('_');
			nn.bookChapter = `${ck[0]}_${ck[1]}`;
			await readingsDocument.addAsync(nn.id, nn);
			notes[nn.id] = nn;
		}
	}

	getAllNotes('*');
}

function addNote(noteID: string, note: any) {
	note.bookChapter = extractBookChapter(note.chapterKey);
	notes[noteID] = note;
	readingsDocument.add(noteID, note);
	getAllNotes('*');
}

function deleteNote(noteID: string) {
	delete notes[noteID];
	readingsDocument.remove(noteID);
	getAllNotes('*');
}

async function searchNotes(id: string, searchTerm: string, indexes: string[]) {
	const results = await readingsDocument.searchAsync(searchTerm, {
		index: indexes
	});

	let filteredNotes: any = {};
	results.forEach((r) => {
		r.result.forEach((id) => {
			filteredNotes[id] = notes[id];
		});
	});
	if (Object.keys(filteredNotes).length > 0) {
		postMessage({ id: id, notes: filteredNotes });
	}
}

function getAllNotes(id: string) {
	postMessage({ id: id, notes: notes });
}

onmessage = async (e) => {
	switch (e.data.action) {
		case 'init':
			await init();
			break;
		case 'addNote':
			addNote(e.data.noteID, e.data.note);
			break;
		case 'deleteNote':
			deleteNote(e.data.noteID);
			break;
		case 'searchNotes':
			await searchNotes(e.data.id, e.data.text, e.data.indexes);
			break;
		case 'getAllNotes':
			getAllNotes(e.data.id);
	}
};

init();
