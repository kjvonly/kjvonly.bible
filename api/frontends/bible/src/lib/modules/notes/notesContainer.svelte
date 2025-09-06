<!-- 
The challenge to solve stemmed from two types of notes.
 

1. There are notes associated to verse words
2. There are notes independent of verse words i.e sermon notes, bible study etc...

ChapterKey variable maps to a location in the bible. <book>_<chapter>_<verse>_<word>. 0_0_0_0 
key is a standalone/independent note.

kjvsearch worker uses flexsearch to index all the notes. We store all notes in indexdb and 
load the notes into a flexsearch index to quickly query notes locally.

We added in the boolean of allNotes to signal we are displaying all notes to the user. 
Users can edit verse word notes as well as independent notes. If a user clicks on the 
note icon in the Bible only the notes associated to that word will be displayed to the user.

-->
<script lang="ts">
	import { chapterApi } from '$lib/api/chapters.api';
	import { notesApi } from '$lib/api/notes.api';
	import { notesService } from '$lib/services/notes.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { toastService } from '$lib/services/toast.service';
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let {
		containerHeight,
		mode = $bindable(),
		annotations = $bindable(),
		allNotes,
		noteIDToOpen = ''
	} = $props();

	let clientHeight = $state(0);
	let clientWidth = $state(0);
	let headerHeight = $state(0);

	let booknames: any = {};

	/**
	 * These variables are set once a user
	 * adds a new note or selects an existing
	 * note.
	 */
	let noteID: string = '';
	let note: any = $state();
	let notes: any = $state({});
	let noteKeys: string[] = $state([]);

	/**
	 * view toggles
	 */
	let showNoteActions = $state(false);
	let showNoteListActions = $state(false);
	let showNoteListFilter = $state(false);
	let showConfirmDelete = $state(false);

	/**
	 * search ID. This id is for filter search
	 * We also subscribe to the '*' searchID
	 * to alway retrieve the latest notes
	 */
	let searchID = uuid4();

	let editor = uuid4().replaceAll('-', '');
	let quill: Quill;

	/**
	 * inputs
	 */
	let tagInput: string = $state('');
	let filterInput: string = $state('');

	/**
	 * Note List
	 */
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
			/** filter to keys with the same chapterKey*/
			Object.keys(results.notes).forEach((k) => {
				if (results.notes[k].chapterKey == mode.chapterKey) {
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

	/**
	 * Filters
	 */
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

	function onFilterInputChanged() {
		if (filterInput.length > 0) {
			let indexes: any = [];
			filterParams.forEach((fp: any) => {
				if (fp.checked) {
					return indexes.push(fp.index);
				}
			});
			notesService.searchNotes(searchID, filterInput, indexes);
		} else {
			updateNotesKeys();
		}
	}

	function onFilterInputResults(results: any) {
		if (results.id === searchID) {
			noteKeys = Object.keys(results.notes).sort((a, b) => {
				return (notes[a].dateUpdated - notes[b].dateUpdated) * -1;
			});
		}
	}

	/**
	 * Note Actions
	 */
	let noteActions: any = {
		delete: () => {
			showConfirmDelete = true;
		},
		'split vertical': () => {
			paneService.onSplitPane(mode.paneId, 'v', 'Modules', {});
			showNoteActions = false;
		},

		'split horizontal': () => {
			paneService.onSplitPane(mode.paneId, 'h', 'Modules', {});
			showNoteActions = false;
		}
	};

	async function onExport() {
		toastService.showToast('starting export data');

		let data: any = {};
		noteKeys.forEach((k) => {
			let n = notes[k];
			let keys = n.chapterKey.split('_');
			let chapterKey = `${keys[0]}_${keys[1]}`;
			let verseNumber = `${keys[2]}`;
			let wordIdx = `${keys[3]}`;

			if (!data[chapterKey]) {
				data[chapterKey] = {
					id: chapterKey
				};
			}

			if (!data[chapterKey][verseNumber]) {
				data[chapterKey][verseNumber] = {
					notes: {
						words: {}
					}
				};
			}

			if (!data[chapterKey][verseNumber].notes.words[wordIdx]) {
				data[chapterKey][verseNumber].notes.words[wordIdx] = {};
			}

			data[chapterKey][verseNumber].notes.words[wordIdx][k] = n;
		});

		let dataList: any[] = [];
		Object.keys(data).forEach((k) => {
			dataList.push(data[k]);
		});

		var element = document.createElement('a');
		element.setAttribute(
			'href',
			'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataList))
		);
		element.setAttribute('download', 'annotations');

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
		toastService.showToast('finished export data');
	}

	function onCloseNote() {
		if (!isShowingOptions()) {
			showNoteActions = false;
			showConfirmDelete = false;
			note = undefined;
			noteID = '';
		}
	}

	/** if an options menu is open close it instead
	 * of closing the view
	 */
	function isShowingOptions() {
		if (showConfirmDelete) {
			showConfirmDelete = false;
			return true;
		}

		if (showNoteActions) {
			showNoteActions = false;
			return true;
		}

		if (showNoteListActions) {
			showNoteListActions = false;
			return true;
		}

		return false;
	}

	function showNoteList() {
		showConfirmDelete = false;
		showNoteActions = false;
		showNoteListActions = false;
	}

	async function onConfirmDelete() {
		notesApi.delete(noteID);
		noteKeys = [];
		delete notes[noteID];
		notesService.deleteNote('*', noteID);
		note = null;
		showNoteList();
	}

	async function onSave(toastMessage: string) {
		let savedNote = await notesApi.put(JSON.parse(JSON.stringify(note)));

		if (savedNote) {
			noteID = savedNote.id;
			note.id = savedNote.id;
			note.chapterKey = savedNote.chapterKey;
			note.version = savedNote.version;
			note.dateCreated = savedNote.dateCreated;
			note.dateUpdated = savedNote.dateUpdated;
			notes[noteID] = note;
			toastService.showToast(toastMessage);
			notesService.addNote('*', noteID, JSON.parse(JSON.stringify(note)));
		}
	}

	async function onAdd() {
		let keys = mode.chapterKey?.split('_');

		let now = Date.now();

		if (keys[0] === '0') {
			note = {
				id: noteID,
				chapterKey: mode.chapterKey,
				text: ``,
				html: ``,
				title: `Note`,
				dateCreated: now,
				dateModified: now,
				tags: [],
				version: 0
			};
		} else {
			// This adds the verse to the note body
			let chapter = await chapterApi.getChapter(mode.chapterKey);
			let verse = chapter['verseMap'][keys[2]];
			let title = `${booknames['shortNames'][keys[0]]} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;

			note = {
				id: noteID,
				chapterKey: mode.chapterKey,
				bcv: `${booknames['shortNames'][keys[0]]} ${keys[1]}:${keys[2]}`,
				text: `${title}\n${verse}`,
				html: `<h1>${title}</h1><p><italic>${verse}</italic></p>`,
				title: `${title}`,
				dateCreated: now,
				dateModified: now,
				tags: [],
				version: 0
			};
		}

		let d = quill.clipboard.convert({ html: note?.html });
		quill.setContents(d, 'silent');
		await onSave(`Created New Note`);
	}

	function onAddTag() {
		if (tagInput && tagInput.length < 1) {
			return;
		}

		let tagId = uuid4();
		if (!note.tags) {
			note.tags = [];
		}
		let now = Date.now();
		note.tags.push({
			id: tagId,
			created: now,
			modified: now,
			tag: tagInput
		});

		tagInput = '';
	}

	function onDeleteTag(tagID: string) {
		if (note) {
			note.tags = note.tags.filter((t: any) => {
				if (t.id !== tagID) {
					return t;
				}
			});
		}
	}

	/**
	 * Note List
	 */
	let noteListActions: any = {
		filter: () => {
			showNoteListFilter = !showNoteListFilter;
			showNoteListActions = false;
		},
		'export filtered notes': () => {
			onExport();
		},
		'split vertical': () => {
			paneService.onSplitPane(mode.paneId, 'v', 'Modules', {});
			showNoteListActions = false;
		},

		'split horizontal': () => {
			paneService.onSplitPane(mode.paneId, 'h', 'Modules', {});
			showNoteListActions = false;
		}
	};

	async function onSelectedNote(noteId: string) {
		noteID = noteId;
		note = notes[noteId];
		let d = quill.clipboard.convert({ html: note?.html });
		quill.setContents(d, 'silent');
	}

	onMount(async () => {
		let element = document.getElementById(editor);
		booknames = await chapterApi.getBooknames();

		/* search */
		notesService.subscribe(searchID, onFilterInputResults);
		notesService.subscribe('*', onSearchResults);
		notesService.getAllNotes('*');

		/* editor */
		if (element) {
			quill = new Quill(element, {
				theme: 'snow'
			});

			quill.on('text-change', (delta, oldDelta, source) => {
				if (source == 'api') {
					console.log('An API call triggered this change.');
				} else if (source == 'user') {
					note.html = quill.getSemanticHTML();
					note.text = quill.getText();
					note.title = note.text.split('\n')[0].substring(0, 20);
				}
			});
		}
	});
</script>

<!-- START NOTE SNIPPETS -->
{#snippet noteHeaderSnippet()}
	<header
		bind:clientHeight={headerHeight}
		class=" flex w-full max-w-lg flex-row items-center justify-between bg-neutral-100 text-neutral-700"
	>
		<button
			aria-label="close"
			onclick={() => {
				onSave(`Saved Note: ${note.title}`);
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg
				version="1.1"
				id="svg2"
				width="100%"
				height="100%"
				viewBox="0 0 96.130432 96"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-16,-16)">
					<path
						class="fill-neutral-700"
						style="stroke-width:1.33333"
						d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 h 33.641558 33.641559 l 11.150928,11.150928 11.15093,11.150928 -0.39855,34.302125 c -0.3976,34.220589 -0.40603,34.308179 -3.54626,36.849069 C 105.2389,111.83737 102.4042,112 63.791681,112 H 22.545455 Z m 55.9361,-12.654045 c 3.502058,-3.50206 4.124506,-5.122865 4.124506,-10.739892 0,-5.693716 -0.607301,-7.222686 -4.358974,-10.974358 C 71.222687,70.607301 69.693716,70 64,70 c -5.693716,0 -7.222687,0.607301 -10.974359,4.358975 -3.737012,3.73701 -4.358974,5.291226 -4.358974,10.892581 0,6.853933 3.398442,12.271284 9.333333,14.877974 4.985283,2.1896 12.806448,0.34607 17.208827,-4.056305 z M 78.4,46.4 c 2.077387,-2.077387 2.077387,-16.055947 0,-18.133333 -2.250848,-2.250848 -47.882485,-2.250848 -50.133333,0 -2.077387,2.077386 -2.077387,16.055946 0,18.133333 2.250848,2.250848 47.882485,2.250848 50.133333,0 z"
						id="path293"
					/>
				</g>
			</svg>
		</button>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<p
			onclick={() => {
				showNoteActions = !showNoteActions;
			}}
			class="hover:cursor-pointer"
		>
			<span class="inline-block font-bold"
				>{note.title}{note.title?.length === 20 ? '...' : ''}</span
			>
			<button aria-label="chevron down" class="h-4 w-4">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 25.4 14.098638"
					version="1.1"
					xml:space="preserve"
					xmlns="http://www.w3.org/2000/svg"
					><g transform="translate(-53.644677,-127.79211)"
						><path
							class="fill-neutral-700"
							style="stroke-width:0.352778"
							d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
							id="path179"
						/></g
					></svg
				>
			</button>
		</p>
		<button
			aria-label="close"
			onclick={() => {
				onCloseNote();
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
				<path
					class="fill-neutral-700"
					d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
				/>
			</svg>
		</button>
	</header>
{/snippet}

{#snippet noteActionsSnippet()}
	<div
		class="flex h-full w-full max-w-lg flex-col items-start justify-start border border-neutral-100"
	>
		{#each Object.keys(noteActions) as na}
			<button
				class="hover:bg-primary-50 w-full py-4 ps-2 text-left capitalize"
				aria-label="note action button"
				onclick={() => noteActions[na]()}
			>
				{na}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet noteConfirmDeleteSnippet()}
	<div
		class="flex h-full w-full max-w-lg flex-col items-center justify-center border border-neutral-100"
	>
		<p class="p-4 capitalize">
			confirm delete <span class="font-semibold"
				>{note.title} {note.title?.length === 20 ? '...' : ''}</span
			>
		</p>
		<div class="flex flex-row space-x-5">
			<button
				onclick={() => {
					onConfirmDelete();
				}}
				aria-label="delete button"
				class="hover:bg-primary-50 rounded-lg bg-neutral-100 p-4 capitalize">delete</button
			>
			<button
				onclick={() => {
					showConfirmDelete = false;
				}}
				aria-label="cancel button"
				class="hover:bg-primary-50 rounded-lg bg-neutral-100 p-4 capitalize">cancel</button
			>
		</div>
	</div>
{/snippet}

{#snippet noteTagInputSnippet()}
	<div class="flex justify-center px-2">
		<label
			for="tags"
			class="focus-within:border-support-a-600 relative block overflow-hidden border-b border-neutral-200 bg-transparent pt-3"
		>
			<div class="flex items-center">
				<input
					type="tags"
					id="tags"
					placeholder="add tags..."
					bind:value={tagInput}
					class="focus:ring-none peer h-8 w-full border-none bg-transparent p-0 outline-none focus:border-transparent focus:outline-hidden"
				/>

				<button
					onclick={() => {
						onAddTag();
					}}
					class="float-end h-8 w-8 p-0.5"
					aria-label="add tag button"
				>
					<svg
						version="1.1"
						id="svg2"
						width="100%"
						height="100%"
						viewBox="0 0 105.50072 106.78786"
						xmlns="http://www.w3.org/2000/svg"
					>
						<defs id="defs6" />
						<g id="g8" transform="translate(-11.214067,-10.602166)">
							<path
								id="path478"
								class="fill-neutral-400"
								style="stroke-width:4.20363;stroke-linejoin:round"
								d="M 63.952348,10.627557 A 52.737736,53.368481 0 0 0 11.214067,63.996697 52.737736,53.368481 0 0 0 63.952348,117.36388 52.737736,53.368481 0 0 0 116.68868,63.996697 52.737736,53.368481 0 0 0 63.952348,10.627557 Z m -4.40625,34.925781 h 8.884766 v 14.335937 h 12.917969 v 8.138672 H 68.430864 V 82.438103 H 59.546098 V 68.027947 H 46.553911 v -8.138672 h 12.992187 z"
							/>
						</g>
					</svg>
				</button>
			</div>
		</label>
	</div>
{/snippet}

{#snippet noteTagsSnippet()}
	<div style="width: {clientWidth}px" class="max-w-lg overflow-hidden">
		<div class="flex flex-row items-end space-y-2 space-x-2 overflow-x-scroll p-2">
			{#each [...note.tags].reverse() as t}
				<span
					class="border-support-a-500 text-support-a-700 inline-flex h-8 items-center justify-center rounded-full border px-2.5 py-0.5"
				>
					<p class="text-sm whitespace-nowrap">{t.tag}</p>

					<button
						aria-label="delete tag"
						onclick={() => {
							onDeleteTag(t.id);
						}}
						class="bg-support-a-200 text-support-a-700 hover:bg-support-a-300 ms-1.5 -me-1 inline-block rounded-full p-0.5 transition"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-3"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</span>
			{/each}
		</div>
	</div>
{/snippet}
<!-- END NOTE SNIPPETS -->

<!-- START NOTE LIST SNIPPETS -->
{#snippet noteListHeader()}
	<header
		bind:clientHeight={headerHeight}
		class=" flex w-full max-w-lg flex-row items-center justify-between bg-neutral-100 text-neutral-700"
	>
		<button
			aria-label="close"
			onclick={() => {
				onAdd();
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg
				class="p-0.5"
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 105.50072 106.78786"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-11.214067,-10.602166)">
					<path
						class="fill-neutral-700"
						style="stroke-width:4.20363;stroke-linejoin:round"
						d="M 63.952348,10.627557 A 52.737736,53.368481 0 0 0 11.214067,63.996697 52.737736,53.368481 0 0 0 63.952348,117.36388 52.737736,53.368481 0 0 0 116.68868,63.996697 52.737736,53.368481 0 0 0 63.952348,10.627557 Z m -4.40625,34.925781 h 8.884766 v 14.335937 h 12.917969 v 8.138672 H 68.430864 V 82.438103 H 59.546098 V 68.027947 H 46.553911 v -8.138672 h 12.992187 z"
					/>
				</g>
			</svg>
		</button>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<p
			onclick={() => {
				showNoteListActions = !showNoteListActions;
			}}
			class="hover:cursor-pointer"
		>
			<span class="inline-block font-bold">Notes</span>
			<button aria-label="chevron down" class="h-4 w-4">
				<svg
					width="100%"
					height="100%"
					viewBox="0 0 25.4 14.098638"
					version="1.1"
					xml:space="preserve"
					xmlns="http://www.w3.org/2000/svg"
					><g transform="translate(-53.644677,-127.79211)"
						><path
							class="fill-neutral-700"
							style="stroke-width:0.352778"
							d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
							id="path179"
						/></g
					></svg
				>
			</button>
		</p>
		<button
			aria-label="close"
			onclick={() => {
				if (allNotes) {
					if (!isShowingOptions()) {
						paneService.onDeletePane(paneService.rootPane, mode.paneId);
					}
				} else {
					if (!isShowingOptions()) {
						mode.notePopup.show = false;
					}
				}
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
				<path
					class="fill-neutral-700"
					d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
				/>
			</svg>
		</button>
	</header>
{/snippet}

{#snippet noteListFilter()}
	<div class="flex flex-col justify-start px-2">
		<label
			for="tags"
			class="focus-within:border-support-a-600 relative block overflow-hidden border-b border-neutral-200 bg-transparent pt-3"
		>
			<div class="flex items-center">
				<input
					type="tags"
					id="tags"
					placeholder="Search Notes..."
					bind:value={filterInput}
					oninput={onFilterInputChanged}
					class="focus:ring-none peer h-8 w-full border-none bg-transparent p-0 outline-none focus:border-transparent focus:outline-hidden"
				/>
			</div>
		</label>
		<div>
			<fieldset>
				{#each filterParams as fp}
					<div class="space-y-2">
						<label for="Option1" class="flex cursor-pointer items-start gap-4">
							<div class="flex items-center">
								&#8203;
								<input
									bind:checked={fp.checked}
									type="checkbox"
									class="accent-support-a-300 size-4 rounded-sm border-neutral-200"
									id="Option1"
								/>
							</div>

							<div>
								<strong class="text-neutral-500 capitalize">
									{fp.option}
								</strong>
							</div>
						</label>
					</div>
				{/each}
			</fieldset>
		</div>
	</div>
{/snippet}

{#snippet actions(note: any, nk: string)}
	<div class="flex w-full flex-row justify-end space-x-4">
		<!-- bible -->
		{#if !note?.chapterKey?.startsWith('0')}
			<button
				aria-label="bible"
				onclick={(e) => {
					e.stopPropagation();
					paneService.onSplitPane(mode.paneId, 'h', 'ChapterComponent', {
						chapterKey: note.chapterKey
					});
				}}
			>
				<svg
					class="h-8 w-8"
					version="1.1"
					id="svg2"
					width="100%"
					height="100%"
					viewBox="0 0 96.115854 120.69053"
					xmlns="http://www.w3.org/2000/svg"
				>
					<g id="g8" transform="translate(-18.550806,-7.6146084)">
						<path
							class="fill-none stroke-neutral-400"
							style="stroke-width:6"
							d="m 114.66666,128 v -5.33334 H 45.333332 C 37.756666,122.66613 24.609066,122.9868 24.609066,112 c 0,-10.9868 13.1476,-10.66614 20.724266,-10.66667 H 114.66666 V 7.9999998 H 53.333332 c -8.2976,0 -19.27,-1.8839866 -26.641999,2.6790132 -9.203733,5.696853 -8.024667,15.89592 -8.024667,25.320986 v 62.666665 c 0,9.123866 -1.5564,19.638396 6.739733,25.796266 C 32.656666,129.84466 43.508266,128 51.999999,128 H 114.66666 M 74.666665,26.666666 v 16 H 87.999998 V 53.333332 H 74.666665 V 82.666665 H 63.999998 V 53.333332 H 50.666665 V 42.666666 h 13.333333 v -16 z"
							id="path293"
						/>
					</g>
				</svg>
			</button>
		{/if}

		<!-- horizontal split -->
		<button
			aria-label="horizontal split"
			onclick={(e) => {
				e.stopPropagation();
				paneService.onSplitPane(mode.paneId, 'h', 'Notes', {
					noteID: nk
				});
			}}
		>
			<svg
				class=" h-8 w-8"
				version="1.1"
				width="100%"
				height="100%"
				viewBox="0 0 94.018994 99.168052"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-16.573607,-13.492392)">
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						width="90"
						height="42.665619"
						x="-108.58311"
						y="-58.167511"
						transform="scale(-1)"
					/>
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						width="90"
						height="42.665619"
						x="-108.58311"
						y="-110.65095"
						transform="scale(-1)"
					/>
				</g>
			</svg>
		</button>

		<!-- vertical split -->
		<button
			aria-label="vertical split"
			onclick={(e) => {
				e.stopPropagation();
				paneService.onSplitPane(mode.paneId, 'v', 'Notes', {
					noteID: nk
				});
			}}
		>
			<svg
				class="h-8 w-8"
				version="1.1"
				id="svg2"
				width="100%"
				height="100%"
				viewBox="0 0 94.018994 99.168052"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g class="" id="g8" transform="translate(-16.898488,-13.804183)">
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						id="rect2158"
						width="90"
						height="42.665619"
						x="-105.81368"
						y="18.907988"
						transform="rotate(-90)"
					/>
					<rect
						style="stroke-width:5;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1"
						class="fill-none stroke-neutral-400"
						id="rect2330"
						width="90"
						height="42.665619"
						x="-105.81368"
						y="70.164314"
						transform="rotate(-90)"
					/>
				</g>
			</svg>
		</button>
	</div>
{/snippet}

{#snippet noteListSnippet()}
	{#each noteKeys as nk}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={() => {
				onSelectedNote(nk);
			}}
			class="flex w-full flex-nowrap p-2 text-left hover:cursor-pointer hover:bg-neutral-100"
		>
			<div class="flex w-full flex-col">
				<span>{notes[nk].title}{notes[nk].title.length === 20 ? '...' : ''}</span>
				<span class="text-neutral-400"
					>{new Date(notes[nk].dateUpdated * 1000).toLocaleDateString()}
					{new Date(notes[nk].dateUpdated * 1000).toLocaleTimeString()}</span
				>
				{#if notes[nk].bcv}
					<span class="text-neutral-400">{notes[nk].bcv}</span>
				{/if}
				<div class="flex flex-wrap items-center justify-start space-x-2 pt-2">
					{#each notes[nk].tags as t}
						<span
							class="border-support-a-500 text-support-a-700 mt-2 inline-flex h-8 items-center justify-center rounded-full border px-2.5 py-2.5"
						>
							<p class="text-sm whitespace-nowrap">{t.tag}</p>
						</span>
					{/each}
				</div>
				<div class="flex flex-wrap items-center justify-end space-x-2 pt-2">
					{@render actions(notes[nk], nk)}
				</div>
			</div>
		</div>
	{/each}
{/snippet}

{#snippet noteListActionsSnippet()}
	<div
		class="flex h-full w-full max-w-lg flex-col items-start justify-start border border-neutral-100"
	>
		{#each Object.keys(noteListActions) as na}
			<button
				class="hover:bg-primary-50 w-full py-4 ps-2 text-left capitalize"
				aria-label="note action button"
				onclick={() => noteListActions[na]()}
			>
				{na}
			</button>
		{/each}
	</div>
{/snippet}
<!-- END NOTE LIST SNIPPETS -->

<div
	bind:clientHeight
	bind:clientWidth
	style={containerHeight}
	class="flex h-full w-full flex-col items-center bg-neutral-50"
>
	{#if note}
		{@render noteHeaderSnippet()}
		{#if showNoteActions}
			{#if !showConfirmDelete}
				{@render noteActionsSnippet()}
			{/if}
			{#if showConfirmDelete}
				{@render noteConfirmDeleteSnippet()}
			{/if}
		{:else}
			<div class="flex w-full max-w-lg flex-col items-start justify-start">
				{@render noteTagInputSnippet()}
				{#if note?.tags}
					{@render noteTagsSnippet()}
				{/if}
			</div>
		{/if}
	{:else}
		{@render noteListHeader()}
		{#if !showNoteListActions}
			<div
				class="flex h-full w-full max-w-lg flex-col overflow-hidden overflow-y-scroll border border-neutral-100"
			>
				{#if showNoteListFilter}
					{@render noteListFilter()}
				{/if}
				{@render noteListSnippet()}
			</div>
		{/if}
		{#if showNoteListActions}
			{@render noteListActionsSnippet()}
		{/if}
	{/if}

	<!-- keep the editor in the dom the while notes container is open. toggle the hidden params. Otherwise we'd need to keep creating this. -->
	<div
		style="height: {clientHeight - headerHeight}px"
		class=" {showNoteActions || !note
			? 'hidden'
			: ''} flex w-full max-w-lg flex-col overflow-y-scroll border"
	>
		<div id={editor}></div>
	</div>
</div>
