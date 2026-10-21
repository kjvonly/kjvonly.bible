<!--
Notes may be standalone, Bible-associated, or normalized-document-associated.
Navigation scope filters installed Notes without changing Note ownership.
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
	import type {
		NoteListItem
	} from './notesList/note-list-item';
	import type {
		NotesNavigationIntent
	} from '../models/notes-navigation.model';
	import {
		filterNotesByBibleScope
	} from '../services/notes-bible-scope';
	import {
		filterNotesByNormalizedDocumentScope
	} from '../services/notes-normalized-document-scope';

	// APPLICATION
	import {
		type NavigationState,
		useApplicationContext
	} from '$lib/application';

	const {
		notesService,
		notesAvailabilityService,
		toastService,
		bibleLocationReferenceService
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		navigationIntent,
		navigationState
	}: {
		navigationIntent: NotesNavigationIntent;
		navigationState: NavigationState;
	} = $props();

	// ================================== VARS =================================

	const NOTE_SUBSCRIPTION_ID = uuid4();
	const NOTE_SEARCH_SUBSCRIPTION_ID = uuid4();
	// Only the most recent search may update the currently scoped list.
	let activeSearchID: string | undefined;
	let note: Note | undefined = $state();
	let notePersisted = $state(false);
	let notes: NotesById = $state({});
	let noteKeys: string[] = $state([]);
	let availableNotes: AvailableNote[] = $state([]);
	let availableSearchGeneration = 0;
	let openedNoteID: string | undefined = $state();
	// The one-time creation request is consumed by the list before opening a draft.
	// The scoped context remains unchanged after the draft closes.
	let pendingNavigationIntent = $state<NotesNavigationIntent>(navigationIntent);
	let noteListItems: NoteListItem[] = $derived(
		createNoteListItems()
	);

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
			notesService.unsubscribe(
				NOTE_SEARCH_SUBSCRIPTION_ID
			);
		};
	});

	// ================================ FUNCS ==================================
	function createNoteListItems(): NoteListItem[] {
		const installedItems =
			noteKeys.flatMap(
				(noteID): NoteListItem[] => {
					const installedNote =
						notes[noteID];

					return installedNote
						? [{
							type: 'installed',
							note: installedNote
						}]
						: [];
				}
			);

		const availableItems =
			availableNotes.map(
				(availableNote): NoteListItem => ({
					type: 'available',
					note: availableNote
				})
			);

		return [
			...installedItems,
			...availableItems
		];
	}

	function updateNotesKeys() {
		noteKeys = Object.keys(notes).sort((a, b) => {
			return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
		});
	}

	/** Apply exactly one Notes context to accepted installed Notes. */
	function filterNotesForNavigation(results: NotesById): NotesById {
		if (navigationIntent.normalizedDocument) {
			return filterNotesByNormalizedDocumentScope(
				results,
				navigationIntent.normalizedDocument.scope
			);
		}

		return filterNotesByBibleScope(
			results,
			navigationIntent.bibleScope,
			bibleLocationReferenceService
		);
	}

	function onSearchResults(results: { notes: NotesById }) {
		noteKeys = [];
		notes = filterNotesForNavigation(results.notes);
		onFilterInputChanged();

		const noteIDToOpen = navigationIntent.noteID ?? '';
		if (
			noteIDToOpen.length > 0 &&
			noteIDToOpen !== openedNoteID &&
			onSelectedNote(noteIDToOpen)
		) {
			openedNoteID = noteIDToOpen;
		}
	}

	/**
	 * Retires the previous search before requesting a new one. Worker searches
	 * may complete out of order (including across import/refresh updates), so
	 * every query has its own result ID and only the latest remains subscribed.
	 */
	function onFilterInputChanged() {
		notesService.unsubscribe(NOTE_SEARCH_SUBSCRIPTION_ID);
		activeSearchID = undefined;
		if (filterInput.length > 0) {
			const indexes: string[] = [];
			filterParams.forEach((fp) => {
				if (fp.checked) {
					return indexes.push(fp.index);
				}
			});
			const searchID = uuid4();
			activeSearchID = searchID;
			notesService.subscribe(
				NOTE_SEARCH_SUBSCRIPTION_ID,
				searchID,
				onFilterInputResults
			);
			notesService.searchNotes(searchID, filterInput, indexes);
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
			navigationIntent.bibleScope !== undefined ||
			navigationIntent.normalizedDocument !== undefined ||
			!titleSearchEnabled
		) {
			availableNotes = [];
			return;
		}

		try {
			const matches =
				await notesAvailabilityService
					.search(
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
		if (results.id === activeSearchID) {
			noteKeys = Object.keys(results.notes)
				.filter((noteID) => notes[noteID] !== undefined)
				.sort((a, b) => {
					return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
				});
		}
	}

	async function onSelectedNoteListItem(
		item: NoteListItem
	): Promise<void> {
		switch (item.type) {
			case 'installed':
				onSelectedNote(
					item.note.id
				);
				return;

			case 'available':
				await onSelectedAvailableNote(
					item.note
				);
				return;
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

	/** Clear only the consumed draft request, preserving the active list scope. */
	function onCreateIntentConsumed(): void {
		if (pendingNavigationIntent.normalizedDocument) {
			pendingNavigationIntent = {
				noteID: pendingNavigationIntent.noteID,
				normalizedDocument: {
					...pendingNavigationIntent.normalizedDocument,
					createTarget: undefined
				}
			};
			return;
		}

		pendingNavigationIntent = {
			...pendingNavigationIntent,
			createBibleLocationRef: undefined
		};
	}
</script>

<!-- ============================== CONTAINER ============================== -->
{#if note}
	<NoteComponent {note} persisted={notePersisted} {onCloseNote}></NoteComponent>
{:else}
	<NotesList
		bind:filterInput
		{noteListItems}
		{onSelectedNoteListItem}
		navigationIntent={pendingNavigationIntent}
		{onCreateIntentConsumed}
		{filterParams}
		{onFilterParamChanged}
		{onFilterInputChanged}
		{onAddNewNote}
		{navigationState}
	></NotesList>
{/if}
