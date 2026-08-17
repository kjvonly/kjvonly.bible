<script lang="ts">
	// ================================ IMPORTS ================================
	// MODELS
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { bibleLocationReferenceService } from '$lib/services/bible/bibleLocationReference.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { toastService } from '$lib/services/toast.service';
	import { verseService } from '$lib/services/bible/verse.service';

	// OTHER
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import { shortBookNamesByIDService } from '$lib/services/bibleMetadata/shortBookNamesByID.service';
	import uuid4 from 'uuid4';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import Bible from '$lib/components/svgs/bible.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';
	import AddNote from '$lib/components/svgs/addNote.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';
	import Close from '$lib/components/svgs/close.svelte';
	import Filter from '$lib/components/svgs/filter.svelte';
	import ClearFilter from '$lib/components/svgs/clearFilter.svelte';
	import BufferBody from '$lib/components/bufferBody.svelte';

	// =============================== BINDINGS ================================

	let {
		mode = $bindable(),
		filterInput = $bindable(),
		noteKeys = $bindable(),
		notes = $bindable(),
		note = $bindable(),
		allNotes,
		filterParams,
		noteIDToOpen = '',
		onFilterInputChanged,
		onAddNewNote
	}: {
		mode: any;
		filterInput: string;
		noteKeys: string[];
		notes: any;
		note: any;
		allNotes: boolean;
		filterParams: any;
		noteIDToOpen: string;
		onFilterInputChanged: any;
		onAddNewNote: any;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let showNoteListActions = $state(false);
	let showNoteListFilter = $state(false);

	let noteListActions: any = {
		filter: () => {
			showNoteListFilter = !showNoteListFilter;
			showNoteListActions = false;
		},
		'export filtered notes': () => {
			onExport();
		},
		'split vertical': () => {
			paneService.onSplitPane(mode.paneID, 'v', Modules.MODULES, {});
			showNoteListActions = false;
		},

		'split horizontal': () => {
			paneService.onSplitPane(mode.paneID, 'h', Modules.MODULES, {});
			showNoteListActions = false;
		}
	};

	// ============================== CLICK FUNCS ==============================

	async function onExport() {
		toastService.showToast('starting export data');

		let data: any = {};
		noteKeys.forEach((k) => {
			let n = notes[k];
			let keys = n.bibleLocationRef.split('_');
			let bibleLocationRef = `${keys[0]}_${keys[1]}`;
			let verseNumber = `${keys[2]}`;
			let wordIdx = `${keys[3]}`;

			if (!data[bibleLocationRef]) {
				data[bibleLocationRef] = {
					id: bibleLocationRef
				};
			}

			if (!data[bibleLocationRef][verseNumber]) {
				data[bibleLocationRef][verseNumber] = {
					notes: {
						words: {}
					}
				};
			}

			if (!data[bibleLocationRef][verseNumber].notes.words[wordIdx]) {
				data[bibleLocationRef][verseNumber].notes.words[wordIdx] = {};
			}

			data[bibleLocationRef][verseNumber].notes.words[wordIdx][k] = n;
		});

		let dataList: any[] = [];
		Object.keys(data).forEach((k) => {
			dataList.push(data[k]);
		});

		var element = document.createElement('a');
		element.setAttribute(
			'href',
			'data:application/json;charset=utf-8,' +
				encodeURIComponent(JSON.stringify(dataList))
		);
		element.setAttribute('download', 'annotations');

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
		toastService.showToast('finished export data');
	}

	async function onAdd() {
		let keys = mode.bibleLocationRef?.split('_');
		let now = Date.now();
		let newNote = undefined;
		let noteID = uuid4();
		if (keys[0] === '0') {
			newNote = {
				id: noteID,
				bibleLocationRef: mode.bibleLocationRef,
				text: ``,
				html: ``,
				title: `Note`,
				dateCreated: now,
				dateUpdated: now,
				tags: [],
				version: 0
			};
		} else {
			let verse = await verseService.get(mode.bibleLocationRef);
			let verseTextWithoutVerseNumber = verse.text.slice(
				verse.text.indexOf(' ') + 1
			);
			let bookName = bibleLocationReferenceService.extractShortBookName(
				mode.bibleLocationRef
			);
			let title = `${bookName} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;
			newNote = {
				id: noteID,
				bibleLocationRef: mode.bibleLocationRef,
				bcv: `${shortBookNamesByIDService.get(keys[0])} ${keys[1]}:${keys[2]}`,
				text: `${title}\n${verseTextWithoutVerseNumber}`,
				html: `<h1>${title}</h1><p><italic>${verseTextWithoutVerseNumber}</italic></p>`,
				title: `${title}`,
				dateCreated: now,
				dateUpdated: now,
				tags: [],
				version: 0
			};
		}

		onAddNewNote(newNote);
	}

	async function onSelectedNote(noteId: string) {
		note = notes[noteId];
	}

	function onBibleClicked(e: Event, note: any): void {
		e.stopPropagation();
		paneService.onSplitPane(mode.paneID, 'h', Modules.BIBLE, {
			bibleLocationRef: note.bibleLocationRef
		});
	}

	function onHorizontalClicked(e: Event, noteID: string): void {
		e.stopPropagation();
		paneService.onSplitPane(mode.paneID, 'h', Modules.NOTES, {
			noteID: noteID
		});
	}

	function onVerticalClicked(e: Event, noteID: string): void {
		e.stopPropagation();
		paneService.onSplitPane(mode.paneID, 'v', Modules.NOTES, {
			noteID: noteID
		});
	}

	function onClose(): void {
		if (allNotes) {
			paneService.onDeletePane(paneService.rootPane, mode.paneID);
		} else {
			mode.notePopup.show = false;
		}
	}

	function onToggleFilter(): void {
		if (showNoteListFilter) {
			filterInput = '';
			onFilterInputChanged();
		}
		showNoteListFilter = !showNoteListFilter;
	}
</script>

<!-- ================================ HEADER =============================== -->
{#snippet noteListHeader()}
	<KJVButton onClick={onAdd} classes="">
		<AddNote></AddNote>
	</KJVButton>
	<KJVButton onClick={onToggleFilter} classes="">
		{#if showNoteListFilter}
			<ClearFilter></ClearFilter>
		{:else}
			<Filter></Filter>
		{/if}
	</KJVButton>

	<span class="">Notes</span>
	<KJVButton
		classes=""
		onClick={() => (showNoteListActions = !showNoteListActions)}
	>
		<Menu></Menu>
	</KJVButton>
	<KJVButton classes="" onClick={onClose}>
		<Close></Close>
	</KJVButton>
{/snippet}

<!-- ================================= BODY ================================ -->

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
		{#if !note?.bibleLocationRef?.startsWith('0')}
			<KJVButton classes="" onClick={(e: Event) => onBibleClicked(e, note)}>
				<Bible></Bible>
			</KJVButton>
		{/if}

		<KJVButton onClick={(e: Event) => onHorizontalClicked(e, nk)} classes="">
			<SplitScreenBottom></SplitScreenBottom>
		</KJVButton>

		<KJVButton onClick={(e: Event) => onVerticalClicked(e, nk)} classes="">
			<SplitScreenRight></SplitScreenRight>
		</KJVButton>
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
				<span
					>{notes[nk].title}{notes[nk].title.length === 20 ? '...' : ''}</span
				>
				<span class="text-neutral-400"
					>{new Date(notes[nk].dateUpdated).toLocaleDateString()}
					{new Date(notes[nk].dateUpdated).toLocaleTimeString()}</span
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
	{#each Object.keys(noteListActions) as na}
		<button
			class="w-full py-4 ps-2 text-left capitalize hover:bg-neutral-100"
			aria-label="note action button"
			onclick={() => noteListActions[na]()}
		>
			{na}
		</button>
	{/each}
{/snippet}

{#snippet noteListBody()}
	{#if !showNoteListActions}
		{#if showNoteListFilter}
			{@render noteListFilter()}
		{/if}
		{@render noteListSnippet()}
	{:else}
		{@render noteListActionsSnippet()}
	{/if}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render noteListHeader()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render noteListBody()}
	</BufferBody>
</BufferContainer>
