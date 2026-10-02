<script lang="ts">
	import { onMount } from 'svelte';

	// ================================ IMPORTS ================================
	import {
		KJVBackButton,
		ViewHeader,
		ViewBody
	} from '$lib/application/ui';

	// MODELS
	import {
		Modules,
		MODULES_VIEWS,
		PaneSplit,
		type NavigationState,
		type NavigationStateValue,
		useApplicationContext,
		useNavigationEntryContext,
		useNavigationRuntimeContext,
		usePaneLayoutContext
	} from '$lib/application';
	import type {
		Note
	} from '../../models/note.model';
	import { createNoteDomainObjectId } from '../../models/note-id';
	import type {
		NoteListItem
	} from './note-list-item';
	import type {
		NoteFilterIndex,
		NoteFilterParameter
	} from '../../ui/note-filter.model';

	// OTHER
	import uuid4 from 'uuid4';
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';
	import { KJVHeader } from '$lib/components';
	import Bible from '$lib/components/svgs/bible.svelte';
	import SplitScreenBottom from '$lib/components/svgs/splitScreenBottom.svelte';
	import SplitScreenRight from '$lib/components/svgs/splitScreenRight.svelte';

	// APPLICATION

	import {
		BIBLE_CHAPTER_RESOURCE_TYPE,
		BIBLE_BOOKNAMES_RESOURCE_TYPE,
		BIBLE_VIEWS
	} from '$lib/domains/bible';

	import {
		NOTES_RESOURCE_TYPE
	} from '../../resources/notes-resource-contract';
	import {
		NOTES_LIST_ACTIONS,
		NOTES_NAVIGATION_RESULTS,
		NOTES_VIEWS,
		type NotesListAction
	} from '../../models/notes-navigation.model';

	import {
		createNoteIdForSource
	} from '../../resources/notes-resource-source';
	const {
		archiveService,
		toastService,
		verseService,
		bibleBooknamesService,
		moduleResourceSelectionResolver
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		onResult,
		whenActive
	} = useNavigationEntryContext();

	const paneLayout = usePaneLayoutContext();

	// =============================== BINDINGS ================================

	let {
		filterInput = $bindable(),
		noteListItems,
		onSelectedNoteListItem,
		bibleLocationRef,
		filterParams,
		onFilterParamChanged,
		onFilterInputChanged,
		onAddNewNote,
		navigationState
	}: {
		filterInput: string;
		noteListItems: NoteListItem[];
		onSelectedNoteListItem: (item: NoteListItem) => Promise<void>;
		bibleLocationRef?: string;
		filterParams: NoteFilterParameter[];
		onFilterParamChanged: (index: NoteFilterIndex, checked: boolean) => void;
		onFilterInputChanged: () => void;
		onAddNewNote: (note: Note) => void;
		navigationState: NavigationState;
	} = $props();

	// ================================== VARS =================================

	let clientHeight = $derived(paneLayout.clientHeight);
	let headerHeight = $state(0);

	let showNoteListFilter = $state(false);
	const noteListControlID = uuid4();

	// =============================== LIFECYCLE ===============================

	onMount(() =>
		onResult(
			onNavigationResult
		)
	);

	// ============================== CLICK FUNCS ==============================

	function onNavigationResult(
		result: NavigationStateValue
	): void {
		if (
			typeof result !== 'object' ||
			result === null ||
			Array.isArray(result) ||
			result.type !==
				NOTES_NAVIGATION_RESULTS.LIST_ACTION ||
			!isNotesListAction(
				result.action
			)
		) {
			return;
		}

		const action = result.action;

		whenActive(() =>
			applyNavigationAction(
				action
			)
		);
	}

	async function applyNavigationAction(
		action: NotesListAction
	): Promise<void> {
		switch (action) {
			case NOTES_LIST_ACTIONS.EXPORT_FILTERED:
				await onExport();
				return;

			case NOTES_LIST_ACTIONS.SPLIT_VERTICAL:
				navigation.split(
					PaneSplit.VERTICAL,
					Modules.MODULES,
					MODULES_VIEWS.ROOT,
					{}
				);
				return;

			case NOTES_LIST_ACTIONS.SPLIT_HORIZONTAL:
				navigation.split(
					PaneSplit.HORIZONTAL,
					Modules.MODULES,
					MODULES_VIEWS.ROOT,
					{}
				);
				return;
		}
	}

	function isNotesListAction(
		value: unknown
	): value is NotesListAction {
		return (
			value === NOTES_LIST_ACTIONS.EXPORT_FILTERED ||
			value === NOTES_LIST_ACTIONS.SPLIT_VERTICAL ||
			value === NOTES_LIST_ACTIONS.SPLIT_HORIZONTAL
		);
	}

	async function onExport(): Promise<void> {
		toastService.showToast(
			'Starting archive export.'
		);

		try {
			const bytes =
				await archiveService.exportIds({
					ids:
						noteListItems.flatMap(
							(item) =>
								item.type === 'installed'
									? [
										createNoteDomainObjectId(
											item.note.id
										)
									]
									: []
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

	function requireResourceSelection(
		resourceType: string
	) {
		return moduleResourceSelectionResolver
			.require(
				navigationState,
				resourceType
			);
	}

	async function onAdd() {
		const keys = bibleLocationRef?.split('_');
		const now = Date.now();
		let newNote: Note;
		const notesSource =
			requireResourceSelection(
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
				requireResourceSelection(
					BIBLE_CHAPTER_RESOURCE_TYPE
				);

			const booknamesSource =
				requireResourceSelection(
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

		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.BIBLE,
			BIBLE_VIEWS.READER,
			{
				bibleLocationRef:
					note.bibleLocationRef
			}
		);
	}

	function onHorizontalClicked(e: Event, noteID: string): void {
		e.stopPropagation();

		navigation.split(
			PaneSplit.HORIZONTAL,
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{ noteID }
		);
	}

	function onVerticalClicked(e: Event, noteID: string): void {
		e.stopPropagation();

		navigation.split(
			PaneSplit.VERTICAL,
			Modules.NOTES,
			NOTES_VIEWS.ROOT,
			{ noteID }
		);
	}

	function onFilterChanged(event: Event, index: NoteFilterIndex): void {
		const input = event.currentTarget as HTMLInputElement;
		onFilterParamChanged(index, input.checked);
	}

	function onOpenActions(): void {
		navigation.pushView(
			NOTES_VIEWS.ACTIONS,
			{}
		);
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

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

{#snippet noteListHeader()}
	<KJVHeader
		title="Notes"
		{leadingContent}
		actions={[
			{
				icon: 'filter',
				label: showNoteListFilter
					? 'Hide note filters'
					: 'Filter notes',
				onClick: onToggleFilter,
				selected: showNoteListFilter
			},
			{
				icon: 'add-note',
				label: 'Add note',
				onClick: () => void onAdd()
			},
			{
				icon: 'more-vertical',
				label: 'More actions',
				onClick: onOpenActions
			}
		]}
	></KJVHeader>
{/snippet}

<!-- ================================= BODY ================================ -->

{#snippet noteListFilter()}
	<div class="flex flex-col justify-start px-2">
		<label
			for={`${noteListControlID}-search`}
			class="focus-within:border-support-a-600 relative block overflow-hidden border-b border-neutral-200 bg-transparent pt-3"
		>
			<div class="flex items-center">
				<input
					type="text"
					id={`${noteListControlID}-search`}
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
						<label
							for={`${noteListControlID}-filter-${fp.option}`}
							class="flex cursor-pointer items-start gap-4"
						>
							<div class="flex items-center">
								&#8203;
								<input
									checked={fp.checked}
									type="checkbox"
									class="accent-support-a-300 size-4 rounded-sm border-neutral-200"
									id={`${noteListControlID}-filter-${fp.option}`}
									onchange={(event) => onFilterChanged(event, fp.index)}
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
	{#each noteListItems as item}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={() => {
				void onSelectedNoteListItem(
					item
				);
			}}
			class="flex w-full flex-nowrap p-2 text-left hover:cursor-pointer hover:bg-neutral-100"
		>
			{#if item.type === 'installed'}
				<div class="flex w-full flex-col">
					<span
						>{item.note.title}{item.note.title.length === 20 ? '...' : ''}</span
					>
					<span class="text-neutral-400"
						>{new Date(item.note.dateUpdated).toLocaleDateString()}
						{new Date(item.note.dateUpdated).toLocaleTimeString()}</span
					>
					{#if item.note.bibleReferenceText}
						<span class="text-neutral-400">{item.note.bibleReferenceText}</span>
					{/if}
					<div class="flex flex-wrap items-center justify-start space-x-2 pt-2">
						{#each item.note.tags as t}
							<span
								class="border-support-a-500 text-support-a-700 mt-2 inline-flex h-8 items-center justify-center rounded-full border px-2.5 py-2.5"
							>
								<p class="text-sm whitespace-nowrap">{t.tag}</p>
							</span>
						{/each}
					</div>
					<div class="flex flex-wrap items-center justify-end space-x-2 pt-2">
						{@render actions(item.note, item.note.id)}
					</div>
				</div>
			{:else}
				<div class="flex w-full flex-col">
					<span>{item.note.name}</span>
					<span class="text-neutral-400">{item.note.path}</span>
				</div>
			{/if}
		</div>
	{/each}
{/snippet}

{#snippet noteListBody()}
	{#if showNoteListFilter}
		{@render noteListFilter()}
	{/if}
	{@render noteListSnippet()}
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<ViewHeader bind:headerHeight>
	{@render noteListHeader()}
</ViewHeader>
<ViewBody {clientHeight} {headerHeight}>
	{@render noteListBody()}
</ViewBody>
