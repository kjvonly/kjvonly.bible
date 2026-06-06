<!-- 
The challenge to solve stemmed from two types of notes.
 

1. There are notes associated to verse words
2. There are notes independent of verse words i.e sermon notes, bible study etc...

bibleLocationRef variable maps to a location in the bible. <book>_<chapter>_<verse>_<word>. 0_0_0_0 
key is a standalone/independent note.

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

	// SERVICES
	import { notesService } from '$lib/services/notes.service';

	// OTHER
	import uuid4 from 'uuid4';
	import Note from './note/note.svelte';
	import NotesList from './notesList/notesList.svelte';

	// =============================== BINDINGS ================================

	let { mode = $bindable(), allNotes, noteIDToOpen = '' } = $props();

	// ================================== VARS =================================

	let noteID: string = '';
	let NOTE_SUBSCRIPTION_ID = uuid4();
	let note: any = $state();
	let notes: any = $state({});
	let noteKeys: string[] = $state([]);

	let NOTE_SEARCH_ID = uuid4();

	let filterInput: string = $state('');

	let filterParams = $state([
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

	onMount(async () => {
		notesService.subscribe(
			NOTE_SUBSCRIPTION_ID,
			NOTE_SEARCH_ID,
			onFilterInputResults
		);
		notesService.subscribe(NOTE_SUBSCRIPTION_ID, '*', onSearchResults);
		notesService.getAllNotes('*');
	});

	// ================================ FUNCS ==================================
	function updateNotesKeys() {
		noteKeys = Object.keys(notes).sort((a, b) => {
			return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
		});
	}

	function onSearchResults(results: any) {
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

		if (noteIDToOpen.length > 0) {
			onSelectedNote(noteIDToOpen);
			noteIDToOpen = '';
		}
	}

	function onFilterInputChanged() {
		if (filterInput.length > 0) {
			let indexes: any = [];
			filterParams.forEach((fp: any) => {
				if (fp.checked) {
					return indexes.push(fp.index);
				}
			});
			notesService.searchNotes(NOTE_SEARCH_ID, filterInput, indexes);
		} else {
			updateNotesKeys();
		}
	}

	function onFilterInputResults(results: any) {
		if (results.id === NOTE_SEARCH_ID) {
			noteKeys = Object.keys(results.notes).sort((a, b) => {
				return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
			});
		}
	}

	async function onSelectedNote(noteId: string) {
		noteID = noteId;
		note = notes[noteId];
	}

	function onAddNewNote(newNote: any) {
		notes[newNote.id] = newNote;
		noteKeys = [newNote.id, ...noteKeys];
		note = newNote;
	}
</script>

<!-- ============================== CONTAINER ============================== -->
{#if note}
	<Note bind:mode bind:note></Note>
{:else}
	<NotesList
		bind:mode
		bind:filterInput
		bind:noteKeys
		bind:notes
		bind:note
		{allNotes}
		{noteIDToOpen}
		{filterParams}
		{onFilterInputChanged}
		{onAddNewNote}
	></NotesList>
{/if}
