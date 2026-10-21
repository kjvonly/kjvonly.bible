import '../../src/app.css';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import type { ApplicationContext } from '$lib/application';
import {
	NOTES_COLLECTION_CHANGED,
	type Note,
	type NotesSearchResult
} from '$lib/domains/notes';
import NotesScopedSearchHost from './fixtures/notes-scoped-search-host.svelte';

const source = { publisher: 'document-publisher', resourceId: 'library/doc/1' };
const note = (id: string, title: string): Note => ({
	id,
	title,
	text: title,
	html: '',
	bibleLocationRef: undefined,
	bibleReferenceText: undefined,
	association: {
		kind: 'normalized-document',
		document: source,
		target: { kind: 'document' }
	},
	dateCreated: 1,
	dateUpdated: 1,
	tags: []
});

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) await unmount(component);
	target?.remove();
	component = undefined;
	target = undefined;
});

describe('normalized-document Notes scoped search', () => {
	it('ignores older search replies after a newer search or collection refresh', async () => {
		const first = note('first', 'First Result');
		const second = note('second', 'Second Result');
		let accepted = { first, second };
		let subscribers: Array<{
			subID: string;
			id: string;
			fn: (result: NotesSearchResult) => void;
		}> = [];
		const requests: Array<{ id: string; text: string }> = [];
		const dispatch = (id: string, notes: Record<string, Note>) => {
			for (const subscriber of [...subscribers]) {
				if (subscriber.id === id) subscriber.fn({ id, notes });
			}
		};
		const notesService = {
			subscribe: (subID: string, id: string, fn: (result: NotesSearchResult) => void) => {
				subscribers.push({ subID, id, fn });
			},
			unsubscribe: (subID: string) => {
				subscribers = subscribers.filter((subscriber) => subscriber.subID !== subID);
			},
			getAllNotes: (id: string) => queueMicrotask(() => dispatch(id, accepted)),
			searchNotes: (id: string, text: string) => { requests.push({ id, text }); }
		};
		const applicationContext = {
			notesService,
			notesAvailabilityService: { search: vi.fn(async () => []) },
			toastService: { showToast: vi.fn() },
			bibleLocationReferenceService: {}
		} as unknown as ApplicationContext;

		target = document.createElement('div');
		document.body.append(target);
		component = mount(NotesScopedSearchHost, {
			target,
			props: {
				applicationContext,
				navigationIntent: {
					normalizedDocument: { scope: { kind: 'document', document: source } }
				}
			}
		});
		await vi.waitFor(() => expect(target?.textContent).toContain('First Result'));

		const filter = [...target!.querySelectorAll<HTMLButtonElement>('button')]
			.find((button) => button.textContent?.trim() === 'Filter notes');
		expect(filter).toBeDefined();
		filter!.click();
		await tick();
		const input = target!.querySelector<HTMLInputElement>('input[placeholder="Search Notes..."]')!;
		expect(input).not.toBeNull();

		input.value = 'First';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await tick();
		input.value = 'Second';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await tick();
		expect(requests).toHaveLength(2);
		expect(requests.map((request) => request.text)).toEqual(['First', 'Second']);
		expect(requests[0].id).not.toBe(requests[1].id);

		dispatch(requests[1].id, { second });
		await tick();
		expect(target?.textContent).toContain('Second Result');
		expect(target?.textContent).not.toContain('First Result');
		dispatch(requests[0].id, { first });
		await tick();
		expect(target?.textContent).toContain('Second Result');
		expect(target?.textContent).not.toContain('First Result');

		// Import/refresh changes the accepted collection and issues another search.
		accepted = { first, second };
		dispatch(NOTES_COLLECTION_CHANGED, accepted);
		await tick();
		expect(requests).toHaveLength(3);
		const latest = requests[2].id;
		dispatch(latest, { second });
		await tick();
		dispatch(requests[1].id, { first });
		await tick();
		expect(target?.textContent).toContain('Second Result');
		expect(target?.textContent).not.toContain('First Result');

		// Clearing the filter restores the scoped collection and retires the query.
		input.value = '';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await tick();
		dispatch(latest, { second });
		await tick();
		expect(target?.textContent).toContain('First Result');
		expect(target?.textContent).toContain('Second Result');
	});
});
