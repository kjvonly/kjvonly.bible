<!--
Notes may be associated with a Bible location or may stand alone.
When bibleLocationRef is supplied by NavigationState, this view shows only
notes for that location. Without it, the view shows all notes.
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
		NotesById
	} from '../models/note.model';
	import type {
		AvailableNote
	} from '../models/available-note';
	import type { NotesSearchResult } from '../runtime/search/notes-search-worker-message';
	import type {
		NoteFilterIndex,
		NoteFilterParameter
	} from '../ui/note-filter.model';
	import {
		NOTES_COLLECTION_CHANGED
	} from '../events/notes-events';
	import NotesList from './notesList/notesList.svelte';

	// APPLICATION
	import {
		type NavigationState,
		useApplicationContext
	} from '$lib/application';

	const {
		notesService,
		toastService
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		bibleLocationRef,
		noteIDToOpen = '',
		navigationState
	}: {
		bibleLocationRef?: string;
		noteIDToOpen: string;
		navigationState: NavigationState;
	} = $props();

	// ================================== VARS =================================

	const NOTE_SUBSCRIPTION_ID = uuid4();
	let note: Note | undefined = $state();
	let notePersisted = $state(false);
	let notes: NotesById = $state({});
	let noteKeys: string[] = $state([]);
	let availableNotes: AvailableNote[] = $state([]);
	let availableSearchGeneration = 0;
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
		if (bibleLocationRef === undefined) {
			noteKeys = [];
			notes = results.notes;
			onFilterInputChanged();
		} else {
			noteKeys = [];
			notes = {};
			/** filter to keys with the same bibleLocationRef*/
			Object.keys(results.notes).forEach((k) => {
				if (results.notes[k].bibleLocationRef === bibleLocationRef) {
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

		void updateAvailableNotes();
	}

	/**
	 * Refreshes discoverable Note Resources for the top-level Notes list.
	 *
	 * Location-specific Notes views remain installed-only because an unresolved
	 * descriptor does not expose Note content or Bible-location metadata.
	 */
	async function updateAvailableNotes(): Promise<void> {
		const generation =
			++availableSearchGeneration;

		const titleSearchEnabled =
			filterInput.length === 0 ||
			filterParams.some(
				(filterParam) =>
					filterParam.index ===
						'title' &&
					filterParam.checked
			);

		if (
			bibleLocationRef !==
				undefined ||
			!titleSearchEnabled
		) {
			availableNotes = [];
			return;
		}

		try {
			const matches =
				await notesService
					.searchAvailableNotes(
						filterInput
					);

			if (
				generation !==
					availableSearchGeneration
			) {
				return;
			}

			availableNotes = [
				...matches
			];
		} catch (error) {
			console.error(
				'Available Notes search failed.',
				error
			);

			if (
				generation ===
					availableSearchGeneration
			) {
				availableNotes = [];
			}
		}
	}

	function onFilterParamChanged(index: NoteFilterIndex, checked: boolean) {
		const filterParam = filterParams.find((fp) => fp.index === index);

		if (!filterParam) {
			return;
		}

		filterParam.checked = checked;
		onFilterInputChanged();
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

	async function onSelectedAvailableNote(
		availableNote: AvailableNote
	): Promise<void> {
		try {
			const installed =
				await notesService
					.getByDescriptor(
						availableNote.descriptor
					);

			availableNotes =
				availableNotes.filter(
					(candidate) =>
						candidate.id !==
							installed.id
				);

			// Edit a working copy so unsaved changes do not mutate list state.
			note = $state.snapshot(
				installed
			);
			notePersisted = true;
		} catch (error) {
			console.error(
				'Available Note load failed.',
				error
			);

			toastService.showToast(
				'Note could not be loaded.'
			);
		}
	}

	function onSelectedNote(noteId: string): boolean {
		const selectedNote = notes[noteId];

		if (!selectedNote) {
			return false;
		}

		// Edit a working copy so unsaved changes do not mutate list state.
		note = $state.snapshot(selectedNote);
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
	<NoteComponent {note} persisted={notePersisted} {onCloseNote}></NoteComponent>
{:else}
	<NotesList
		bind:filterInput
		{noteKeys}
		{notes}
		{availableNotes}
		{onSelectedNote}
		{onSelectedAvailableNote}
		{bibleLocationRef}
		{filterParams}
		{onFilterParamChanged}
		{onFilterInputChanged}
		{onAddNewNote}
		{navigationState}
	></NotesList>
{/if}
