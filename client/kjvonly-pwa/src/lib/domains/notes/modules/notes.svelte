<!-- 
The challenge to solve stemmed from two types of notes.
 

1. There are notes associated to verse words
2. There are notes independent of verse words i.e sermon notes, bible study etc...

bibleLocationRef maps a Bible-linked Note to <book>_<chapter>_<verse>_<word>.
Standalone Notes use an undefined bibleLocationRef.

kjvsearch worker uses flexsearch to index all the notes. We store all notes in indexdb and 
load the notes into a flexsearch index to quickly query notes locally.

We added in the boolean of allNotes to signal we are displaying all notes to the user. 
Users can edit verse word notes as well as independent notes. If a user clicks on the 
note icon in the Bible only the notes associated to that word will be displayed to the user.

-->
<script lang="ts">
	// ================================ IMPORTS ================================
	// SVELTE
	import { onMount } from 'svelte';

	// OTHER
	import uuid4 from 'uuid4';
	import NoteComponent from './note/note.svelte';
	import type {
		Note,
		NotesById,
		NotesMode
	} from '../models/note.model';
	import type { NotesSearchResult } from '../runtime/search/notes-search-worker-message';
	import type { NoteFilterParameter } from '../ui/note-filter.model';
	import {
		NOTES_COLLECTION_CHANGED
	} from '../events/notes-events';
	import NotesList from './notesList/notesList.svelte';

	// APPLICATION
	import { useApplicationContext } from '$lib/application';

	const {
		notesService
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		paneID,
		mode = $bindable<NotesMode>(),
		allNotes,
		noteIDToOpen = ''
	}: {
		paneID: string;
		mode: NotesMode;
		allNotes: boolean;
		noteIDToOpen: string;
	} = $props();

	// ================================== VARS =================================

	const NOTE_SUBSCRIPTION_ID = uuid4();
	let note: Note | undefined = $state();
	let notePersisted = $state(false);
	let notes: NotesById = $state({});
	let noteKeys: string[] = $state([]);
	let openedNoteID: string | undefined = $state();

	const NOTE_SEARCH_ID = uuid4();

	let filterInput: string = $state('');

	let filterParams: NoteFilterParameter[] = $state([
		{
			option: 'title',
			index: 'title',
			checked: true
		},
		{
			option: 'text',
			index: 'text',
			checked: true
		},
		{
			option: 'tags',
			index: 'tags[]:tag',
			checked: true
		}
	]);

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		notesService.subscribe(
			NOTE_SUBSCRIPTION_ID,
			NOTE_SEARCH_ID,
			onFilterInputResults
		);
		notesService.subscribe(
			NOTE_SUBSCRIPTION_ID,
			NOTES_COLLECTION_CHANGED,
			onSearchResults
		);
		notesService.getAllNotes(
			NOTES_COLLECTION_CHANGED
		);

		return () => {
			notesService.unsubscribe(
				NOTE_SUBSCRIPTION_ID
			);
		};
	});

	// ================================ FUNCS ==================================
	function updateNotesKeys() {
		noteKeys = Object.keys(notes).sort((a, b) => {
			return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
		});
	}

	function onSearchResults(results: { notes: NotesById }) {
		if (allNotes) {
			noteKeys = [];
			notes = results.notes;
			onFilterInputChanged();
		} else {
			noteKeys = [];
			notes = {};
			/** filter to keys with the same bibleLocationRef*/
			Object.keys(results.notes).forEach((k) => {
				if (results.notes[k].bibleLocationRef == mode.bibleLocationRef) {
					notes[k] = results.notes[k];
				}
			});
			onFilterInputChanged();
		}

		if (
			noteIDToOpen.length > 0 &&
			noteIDToOpen !== openedNoteID &&
			onSelectedNote(noteIDToOpen)
		) {
			openedNoteID = noteIDToOpen;
		}
	}

	function onFilterInputChanged() {
		if (filterInput.length > 0) {
			const indexes: string[] = [];
			filterParams.forEach((fp) => {
				if (fp.checked) {
					return indexes.push(fp.index);
				}
			});
			notesService.searchNotes(NOTE_SEARCH_ID, filterInput, indexes);
		} else {
			updateNotesKeys();
		}
	}

	function onFilterInputResults(results: NotesSearchResult) {
		if (results.id === NOTE_SEARCH_ID) {
			noteKeys = Object.keys(results.notes)
				.filter((noteID) => notes[noteID] !== undefined)
				.sort((a, b) => {
					return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
				});
		}
	}

	function onSelectedNote(noteId: string): boolean {
		const selectedNote = notes[noteId];

		if (!selectedNote) {
			return false;
		}

		// Edit a working copy so unsaved changes do not mutate list state.
		note = structuredClone(selectedNote);
		notePersisted = true;
		return true;
	}

	function onCloseNote() {
		note = undefined;
		notePersisted = false;
	}

	function onAddNewNote(newNote: Note) {
		// New notes remain editor-local drafts until Save persists them.
		note = newNote;
		notePersisted = false;
	}
</script>

<!-- ============================== CONTAINER ============================== -->
{#if note}
	<NoteComponent {paneID} {note} persisted={notePersisted} {onCloseNote}></NoteComponent>
{:else}
	<NotesList
		{paneID}
		bind:mode
		bind:filterInput
		{noteKeys}
		{notes}
		{onSelectedNote}
		{allNotes}
		{filterParams}
		{onFilterInputChanged}
		{onAddNewNote}
	></NotesList>
{/if}
