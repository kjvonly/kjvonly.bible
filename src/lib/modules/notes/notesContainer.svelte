<!-- 
The challenge to solve stemmed from two types of notes.
 

1. There are notes associated to verse words
2. There are notes independent of verse words i.e sermon notes, bible study etc...

Bible data is grouped by chapter. Since this is the case we also grouped our
annotations by chapter. All annotations for Genesis 1 will exist in indexedDB
and have a key of 1_1 i.e the chapterKey. To associate the note to a verse and 
a word we extend the chapterKey to include the verse and word index. For example,
the chapter key of the first word in verse 1 of Genesis 1 is 1_1_1_0.

In the annotations we group by verse meaning the verse object will have a type of 
annotations associated with it. At 1_1_1, the object will have a notes object. That
notes object will have a words object with keys of the word index.

let annotations = getAnnotations('1_1')
// annotations[1].notes.words[0] means note annotations at verse 1 word 0
let notes = annotations[1].notes.words[0] 

Now we have the second type of note, the independent note. To keep things simple
we create a new chapterKey 0_0_0_0. Theres not a bible chapter associated to this but 
it's a clean way to use the chapter key as the index for all other notes.

let annotations = getAnnotations('0_0')
// annotations[0].notes.words[0] would contain all independent note. We specify this 
// chapterKey in the notes.svelte component
let notes = annotations[1].notes.words[0] 

We added in the boolean of allNotes to signal we are displaying all notes to the user. 
Users can edit verse word notes as well as independent notes. If a user clicks on the 
note icon in the Bible only the notes associated to that word will be displayed to the user.

-->
<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { searchService } from '$lib/services/search.service';
	import { toastService } from '$lib/services/toast.service';
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let {
		containerHeight,
		mode = $bindable(),
		annotations = $bindable(),
		allNotes = false
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
	let verseIdx = 0;
	let wordIdx = 0;

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
			return (notes[a].modified - notes[b].modified) * -1;
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
			initNotes();
			/** filter to keys with the same chapterKey*/
			Object.keys(results.notes).forEach((k) => {
				if (results.notes[k].chapterKey == mode.chapterKey) {
					notes[k] = results.notes[k];
				}
			});
			onFilterInputChanged();
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
			searchService.searchNotes(searchID, filterInput, indexes);
		} else {
			updateNotesKeys();
		}
	}

	function onFilterInputResults(results: any) {
		if (results.id === searchID) {
			noteKeys = Object.keys(results.notes).sort((a, b) => {
				return (notes[a].modified - notes[b].modified) * -1;
			});
		}
	}

	/**
	 * Note Actions
	 */
	let noteActions: any = {
		delete: () => {
			showConfirmDelete = true;
		}
	};

	function onCloseNote() {
		showNoteActions = false;
		showConfirmDelete = false;
		note = undefined;
		noteID = '';
	}

	async function onConfirmDelete() {
		delete annotations[verseIdx].notes.words[wordIdx][noteID];
		await chapterService.putAnnotations(JSON.parse(JSON.stringify(annotations)));
		noteKeys = [];
		delete notes[noteID];
		searchService.deleteNote('*', noteID);
		onCloseNote();
	}

	async function onSave(toastMessage: string) {
		annotations[verseIdx].notes.words[wordIdx][noteID] = note;
		notes[noteID] = note;

		await chapterService.putAnnotations(JSON.parse(JSON.stringify(annotations)));
		toastService.showToast(toastMessage);
		searchService.addNote('*', noteID, JSON.parse(JSON.stringify(note)));
	}

	function initNotes() {
		let keys = mode.chapterKey?.split('_');
		if (keys?.length > 3) {
			verseIdx = keys[2];
			wordIdx = keys[3];
			if (!annotations[verseIdx]) {
				annotations[verseIdx] = {};
			}

			if (!annotations[verseIdx].notes) {
				annotations[verseIdx].notes = {};
			}

			if (!annotations[verseIdx].notes.words) {
				annotations[verseIdx].notes.words = {};
			}

			if (!annotations[verseIdx].notes.words[wordIdx]) {
				annotations[verseIdx].notes.words[wordIdx] = {};
			}
		} else {
			toastService.showToast(`invalid chapter key: ${mode.chapterKey}`);
		}
	}

	async function onAdd() {
		let keys = mode.chapterKey?.split('_');
		annotations = await chapterService.getAnnotations(`${keys[0]}_${keys[1]}`);

		initNotes();

		noteID = uuid4();
		let now = Date.now();

		if (keys[0] === '0') {
			annotations[verseIdx].notes.words[wordIdx][noteID] = {
				chapterKey: mode.chapterKey,
				text: ``,
				html: ``,
				title: `Note`,
				created: now,
				modified: now,
				tags: []
			};
		} else {
			let chapter = await chapterService.getChapter(mode.chapterKey);
			let verse = chapter['verseMap'][verseIdx];
			let title = `${booknames['shortNames'][keys[0]]} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;

			annotations[verseIdx].notes.words[wordIdx][noteID] = {
				chapterKey: mode.chapterKey,
				text: `${title}\n${verse}`,
				html: `<h1>${title}</h1><p><italic>${verse}</italic></p>`,
				title: `${title}`,
				created: now,
				modified: now,
				tags: []
			};
		}
		note = annotations[verseIdx].notes.words[wordIdx][noteID];

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
		let keys = note.chapterKey?.split('_');

		annotations = await chapterService.getAnnotations(`${keys[0]}_${keys[1]}`);
		verseIdx = keys[2];
		wordIdx = keys[3];

		note = annotations[verseIdx].notes.words[wordIdx][noteId];
		let d = quill.clipboard.convert({ html: note?.html });
		quill.setContents(d, 'silent');
	}

	onMount(async () => {
		let element = document.getElementById(editor);
		booknames = await chapterService.getBooknames();

		/* search */
		searchService.subscribe(searchID, onFilterInputResults);
		searchService.subscribe('*', onSearchResults);
		searchService.getAllNotes('*');

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
				class="w-full py-4 ps-2 text-left capitalize hover:bg-primary-50"
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
				class="rounded-lg bg-neutral-100 p-4 capitalize hover:bg-primary-50">delete</button
			>
			<button
				onclick={() => {
					showConfirmDelete = false;
				}}
				aria-label="cancel button"
				class="rounded-lg bg-neutral-100 p-4 capitalize hover:bg-primary-50">cancel</button
			>
		</div>
	</div>
{/snippet}

{#snippet noteTagInputSnippet()}
	<div class="flex justify-center px-2">
		<label
			for="tags"
			class="relative block overflow-hidden border-b border-neutral-200 bg-transparent pt-3 focus-within:border-supporta-600"
		>
			<div class="flex items-center">
				<input
					type="tags"
					id="tags"
					placeholder="add tags..."
					bind:value={tagInput}
					class="focus:outline-hidden focus:ring-none peer h-8 w-full border-none bg-transparent p-0 outline-none focus:border-transparent"
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
		<div class="flex flex-row items-end space-x-2 space-y-2 overflow-x-scroll p-2">
			{#each [...note.tags].reverse() as t}
				<span
					class="inline-flex h-8 items-center justify-center rounded-full border border-supporta-500 px-2.5 py-0.5 text-supporta-700"
				>
					<p class="whitespace-nowrap text-sm">{t.tag}</p>

					<button
						aria-label="delete tag"
						onclick={() => {
							onDeleteTag(t.id);
						}}
						class="-me-1 ms-1.5 inline-block rounded-full bg-supporta-200 p-0.5 text-supporta-700 transition hover:bg-supporta-300"
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
			<span class="inline-block font-bold">Note</span>
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
					paneService.onDeletePane(paneService.rootPane, mode.paneId);
				} else {
					mode.notePopup.show = false;
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
			class="relative block overflow-hidden border-b border-neutral-200 bg-transparent pt-3 focus-within:border-supporta-600"
		>
			<div class="flex items-center">
				<input
					type="tags"
					id="tags"
					placeholder="Search Notes..."
					bind:value={filterInput}
					oninput={onFilterInputChanged}
					class="focus:outline-hidden focus:ring-none peer h-8 w-full border-none bg-transparent p-0 outline-none focus:border-transparent"
				/>
			</div>
		</label>
		<div>
			<fieldset>
				<legend class="sr-only">Checkboxes</legend>
				{#each filterParams as fp}
					<div class="space-y-2">
						<label for="Option1" class="flex cursor-pointer items-start gap-4">
							<div class="flex items-center">
								&#8203;
								<input
									bind:checked={fp.checked}
									type="checkbox"
									class="size-4 rounded-sm border-neutral-200 accent-supporta-300"
									id="Option1"
								/>
							</div>

							<div>
								<strong class="capitalize text-neutral-500">
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

{#snippet noteListSnippet()}
	{#each noteKeys as nk}
		<button
			onclick={() => {
				onSelectedNote(nk);
			}}
			class="flex w-full flex-nowrap p-2 text-left hover:bg-neutral-100"
		>
			<div class="flex flex-col">
				<span>{notes[nk].title}{notes[nk].title.length === 20 ? '...' : ''}</span>
				<span class="text-neutral-400"
					>{new Date(notes[nk].modified).toLocaleDateString()}
					{new Date(notes[nk].modified).toLocaleTimeString()}</span
				>
				<div class="flex flex-row justify-start space-x-2 pt-2">

					{#each notes[nk].tags as t}
						<span
							class="inline-flex h-8 items-center justify-center rounded-full border border-supporta-500 px-2.5 py-0.5 text-supporta-700"
						>
							<p class="whitespace-nowrap text-sm">{t.tag}</p>
						</span>
					{/each}
				</div>
			</div>
		</button>
	{/each}
{/snippet}

{#snippet noteListActionsSnippet()}
	<div
		class="flex h-full w-full max-w-lg flex-col items-start justify-start border border-neutral-100"
	>
		{#each Object.keys(noteListActions) as na}
			<button
				class="w-full py-4 ps-2 text-left capitalize hover:bg-primary-50"
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
