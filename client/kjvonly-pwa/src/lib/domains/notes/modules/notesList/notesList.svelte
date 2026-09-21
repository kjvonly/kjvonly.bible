<script lang="ts">
	// ================================ IMPORTS ================================
	// MODELS
	import { Modules, PaneSplit, useApplicationContext } from '$lib/application';
	import type {
		Note,
		NotesById,
		NotesMode
	} from '../../models/note.model';
	import { createNoteDomainObjectId } from '../../models/note-id';
	import type { NoteFilterParameter } from '../../ui/note-filter.model';

	// OTHER
	import { BufferContainer, BufferHeader, BufferBody } from '$lib/application/ui';
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

	// APPLICATION

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE
	} from '$lib/domains/bible';

	import {
		NOTES_RESOURCE_TYPE
	} from '../../resources/note-interpreter';

	import {
		createNoteIdForSource
	} from '../../resources/notes-resource-source';
	const {
		archiveService,
		workspaceRuntime,
		toastService,
		verseService,
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();


	// =============================== BINDINGS ================================

	let {
		paneID,
		mode = $bindable(),
		filterInput = $bindable(),
		noteKeys,
		notes,
		onSelectedNote,
		allNotes,
		filterParams,
		onFilterInputChanged,
		onAddNewNote
	}: {
		paneID: string;
		mode: NotesMode;
		filterInput: string;
		noteKeys: string[];
		notes: NotesById;
		onSelectedNote: (noteId: string) => void;
		allNotes: boolean;
		filterParams: NoteFilterParameter[];
		onFilterInputChanged: () => void;
		onAddNewNote: (note: Note) => void;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let showNoteListActions = $state(false);
	let showNoteListFilter = $state(false);

	const noteListActions: Record<string, () => void> = {
		filter: () => {
			showNoteListFilter = !showNoteListFilter;
			showNoteListActions = false;
		},
		'export filtered notes': () => {
			void onExport();
		},
		'split vertical': () => {
			workspaceRuntime.splitPane(paneID, PaneSplit.VERTICAL, Modules.MODULES, {});
			showNoteListActions = false;
		},

		'split horizontal': () => {
			workspaceRuntime.splitPane(paneID, PaneSplit.HORIZONTAL, Modules.MODULES, {});
			showNoteListActions = false;
		}
	};

	// ============================== CLICK FUNCS ==============================

	async function onExport(): Promise<void> {
		toastService.showToast(
			'Starting archive export.'
		);

		try {
			const bytes =
				await archiveService.exportIds({
					ids:
						noteKeys.map(
							createNoteDomainObjectId
						)
				});

			downloadArchive(
				bytes
			);

			toastService.showToast(
				'Archive export finished.'
			);
		} catch (error) {
			console.error(
				'Notes archive export failed.',
				error
			);

			toastService.showToast(
				'Archive export failed.'
			);
		}
	}

	function downloadArchive(
		bytes: Uint8Array
	): void {
		const blob =
			new Blob(
				[new Uint8Array(bytes)],
				{
					type:
						'application/gzip'
				}
			);

		const url =
			URL.createObjectURL(
				blob
			);

		const anchor =
			document.createElement(
				'a'
			);

		anchor.href = url;
		anchor.download =
			`kjvonly-notes-${new Date().toISOString().slice(0, 10)}.kjva`;
		anchor.style.display = 'none';

		document.body.appendChild(
			anchor
		);

		anchor.click();
		anchor.remove();

		URL.revokeObjectURL(
			url
		);
	}

	async function onAdd() {
		const bibleLocationRef: string | undefined =
			mode.bibleLocationRef;
		const keys = bibleLocationRef?.split('_');
		const now = Date.now();
		let newNote: Note;
		const notesSource =
			moduleResourceSelectionResolver.require(
				paneID,
				NOTES_RESOURCE_TYPE
			);

		const noteID =
			createNoteIdForSource(
				notesSource,
				uuid4()
			);
		if (!bibleLocationRef || !keys) {
			newNote = {
				id: noteID,
				bibleLocationRef: undefined,
				bibleReferenceText: undefined,
				text: ``,
				html: ``,
				title: `Note`,
				dateCreated: now,
				dateUpdated: now,
				tags: []
			};
		} else {
			const [
				bookID,
				chapterNumber,
				verseNumber,
				wordIndex
			] = keys;

			if (!bookID || !chapterNumber || !verseNumber) {
				throw new Error(
					`Invalid Bible location reference: ${bibleLocationRef}`
				);
			}

			const chapterSource =
				moduleResourceSelectionResolver.require(
					paneID,
					BIBLE_CHAPTER_RESOURCE_TYPE
				);

			const booknamesSource =
				moduleResourceSelectionResolver.require(
					paneID,
					BIBLE_BOOKNAMES_RESOURCE_TYPE
				);

			const [
				verse,
				booknames
			] = await Promise.all([
				verseService.get(
					chapterSource,
					bibleLocationRef
				),
				bibleBooknamesService.get(
					booknamesSource
				)
			]);

			const verseTextWithoutVerseNumber = verse.text.slice(
				verse.text.indexOf(' ') + 1
			);

			const bookName =
				booknames.shortNames[bookID] ?? '';

			const wordSuffix =
				wordIndex && Number(wordIndex) > 0
					? `:${wordIndex}`
					: '';

			const title =
				`${bookName} ${chapterNumber}:${verseNumber}${wordSuffix}`;

			newNote = {
				id: noteID,
				bibleLocationRef,
				bibleReferenceText: `${bookName} ${chapterNumber}:${verseNumber}`,
				text: `${title}\n${verseTextWithoutVerseNumber}`,
				html: `<h1>${title}</h1><p><italic>${verseTextWithoutVerseNumber}</italic></p>`,
				title: `${title}`,
				dateCreated: now,
				dateUpdated: now,
				tags: []
			};
		}

		onAddNewNote(newNote);
	}

	function onBibleClicked(e: Event, note: Note): void {
		e.stopPropagation();
		workspaceRuntime.splitPane(paneID, PaneSplit.HORIZONTAL, Modules.BIBLE, {
			bibleLocationRef: note.bibleLocationRef
		});
	}

	function onHorizontalClicked(e: Event, noteID: string): void {
		e.stopPropagation();
		workspaceRuntime.splitPane(paneID, PaneSplit.HORIZONTAL, Modules.NOTES, {
			noteID: noteID
		});
	}

	function onVerticalClicked(e: Event, noteID: string): void {
		e.stopPropagation();
		workspaceRuntime.splitPane(paneID, PaneSplit.VERTICAL, Modules.NOTES, {
			noteID: noteID
		});
	}

	function onClose(): void {
		if (allNotes) {
			workspaceRuntime.closePane(paneID);
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

{#snippet actions(note: Note, nk: string)}
	<div class="flex w-full flex-row justify-end space-x-4">
		<!-- bible -->
		{#if note.bibleLocationRef}
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
				{#if notes[nk].bibleReferenceText}
					<span class="text-neutral-400">{notes[nk].bibleReferenceText}</span>
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

<!--
	Own BufferContainer here because NotesList can be reached through
	NotesContainer or through the Bible popup, which renders Notes directly.
-->
<BufferContainer bind:clientHeight>
	<BufferHeader bind:headerHeight>
		{@render noteListHeader()}
	</BufferHeader>
	<BufferBody {clientHeight} {headerHeight}>
		{@render noteListBody()}
	</BufferBody>
</BufferContainer>
