<script lang="ts">
	import { BufferHeader } from '$lib/application/ui';

	// SVELTE
	import { onMount } from 'svelte';

	// COMPONENTS
	import KJVButton from '$lib/components/buttons/KJVButton.svelte';

	// // SVGS
	import Close from '$lib/components/svgs/close.svelte';
	import Delete from '$lib/components/svgs/delete.svelte';
	import Menu from '$lib/components/svgs/menu.svelte';
	import NoTag from '$lib/components/svgs/noTag.svelte';
	import Save from '$lib/components/svgs/save.svelte';
	import Tag from '$lib/components/svgs/tag.svelte';

	// MODELS
	import { Modules } from '$lib/application';
	import type {
		NoteTag,
		NotesMode
	} from '../../models/note.model';

	// SERVICES
	import { PaneSplit, useApplicationContext } from '$lib/application';

	// OTHER
	import Quill from 'quill';
	import uuid4 from 'uuid4';
	import NewTag from '$lib/components/svgs/newTag.svelte';
	import { findElement } from '$lib/application/ui';
	import { parseNoteTagInput } from './note-tag-input';

	// APPLICATION
	const {
		workspaceRuntime,
		toastService
	} = useApplicationContext();

	const {
		notesService
	} = useApplicationContext();

	// =============================== BINDINGS ================================

	let {
		clientHeight = $bindable<number>(),
		mode = $bindable<NotesMode>(),
		note = $bindable()
	} = $props();

	// ================================== VARS =================================

	let headerHeight = $state(0);
	let noteID: string = '';
	let showConfirmDelete = $state(false);
	let showNoteActions = $state(false);
	let showNoteListActions = $state(false);
	let showTags: boolean = $state(false);
	let tagContainerHeight = $state(0);
	let tagInput: string = $state('');
	let tagID: string = uuid4();

	/** editor*/
	let editor = uuid4().replaceAll('-', '');
	let quill: Quill;

	const noteActions: Record<string, () => void> = {
		delete: () => {
			showConfirmDelete = true;
		},
		'split vertical': () => {
			workspaceRuntime.splitPane(mode.paneID, PaneSplit.VERTICAL, Modules.MODULES, {});
			showNoteActions = false;
		},

		'split horizontal': () => {
			workspaceRuntime.splitPane(mode.paneID, PaneSplit.HORIZONTAL, Modules.MODULES, {});
			showNoteActions = false;
		}
	};

	// =============================== LIFECYCLE ===============================

	onMount(async () => {
		noteID = note.id;
		let element = document.getElementById(editor);

		/* editor */
		if (element) {
			quill = new Quill(element, {
				theme: 'snow'
			});

			quill.on('text-change', (_delta, _oldDelta, source) => {
				if (source !== 'user') {
					return;
				}

				note.html = quill.getSemanticHTML();
				note.text = quill.getText();
				note.title = note.text.split('\n')[0].substring(0, 20);
			});

			let d = quill.clipboard.convert({ html: note?.html });
			quill.setContents(d, 'silent');
		}
	});

	// ================================ FUNCS ==================================

	// TODO add popup
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

	// ============================== CLICK FUNCS ==============================

	async function onConfirmDelete() {
		await notesService.delete(
			note.id
		);

		note = undefined;
	}

	async function onSave(toastMessage: string) {
		await notesService.put(
			JSON.parse(
				JSON.stringify(
					note
				)
			)
		);

		noteID = note.id;
		toastService.showToast(
			toastMessage
		);
	}

	async function onAddTag() {
		const tags = parseNoteTagInput(tagInput);

		if (tags.length === 0) {
			return;
		}

		if (!note.tags) {
			note.tags = [];
		}

		tags.forEach((tag) => {
			const now = Date.now();

			note.tags.push({
				id: uuid4(),
				created: now,
				modified: now,
				tag
			});
		});

		tagInput = '';
		const el = await findElement(`${tagID}-tags`);
		el?.focus();
	}

	function onDeleteTag(tagID: string) {
		if (note) {
			note.tags = note.tags.filter(
				(tag: NoteTag) => tag.id !== tagID
			);
		}
	}

	function onCloseNote() {
		if (!isShowingOptions()) {
			showNoteActions = false;
			showConfirmDelete = false;
			note = undefined;
			noteID = '';
		}
	}
</script>

<!-- ================================ HEADER =============================== -->

<!-- START NOTE SNIPPETS -->
{#snippet noteHeaderSnippet()}
	<div class="grid w-full grid-cols-5 place-items-center">
		<KJVButton classes="" onClick={() => onSave(`Saved Note: ${note.title}`)}>
			<Save></Save>
		</KJVButton>

		<KJVButton classes="" onClick={() => (showTags = !showTags)}>
			{#if showTags}
				<NoTag></NoTag>
			{:else}
				<Tag></Tag>
			{/if}
		</KJVButton>
		<span class="text-center"
			>{note.title}{note.title?.length === 20 ? '...' : ''}</span
		>
		<KJVButton classes="" onClick={() => (showNoteActions = !showNoteActions)}>
			<Menu></Menu>
		</KJVButton>

		<KJVButton classes="" onClick={onCloseNote}>
			<Close></Close>
		</KJVButton>
	</div>
{/snippet}
<!-- ================================= BODY ================================ -->

{#snippet noteActionsSnippet()}
	<div
		class="flex h-full w-full flex-col items-start justify-start border border-neutral-100"
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
		class="flex h-full w-full flex-col items-center justify-center border border-neutral-100"
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
				class="hover:bg-primary-50 rounded-lg bg-neutral-100 p-4 capitalize"
				>delete</button
			>
			<button
				onclick={() => {
					showConfirmDelete = false;
				}}
				aria-label="cancel button"
				class="hover:bg-primary-50 rounded-lg bg-neutral-100 p-4 capitalize"
				>cancel</button
			>
		</div>
	</div>
{/snippet}

{#snippet noteTagInputSnippet()}
	{#if showTags}
		<div class="flex-fill flex w-full px-2">
			<label
				for="tags"
				class="focus-within:border-support-a-600 relative block w-full overflow-hidden border-b border-neutral-200 bg-transparent pt-3"
			>
				<div class="flex items-center">
					<input
						type="tags"
						id="{tagID}-tags"
						placeholder="tag 1, tag 2, tag 3, ..."
						bind:value={tagInput}
						class="focus:ring-none peer h-8 w-full border-none bg-transparent p-0 outline-none focus:border-transparent focus:outline-hidden"
					/>

					<KJVButton classes="" onClick={onAddTag}>
						<NewTag></NewTag>
					</KJVButton>
				</div>
			</label>
		</div>
	{/if}
{/snippet}

{#snippet noteTagsSnippet()}
	{#if showTags}
		<div class="overflow-hidden">
			<div class="flex flex-wrap items-end space-x-2 p-2">
				{#each [...note.tags].reverse() as t}
					<span class="py-2">
						<span
							class="border-support-a-500 text-support-a-700 inline-flex items-center justify-center rounded-full border p-1 px-2.5"
						>
							<span class="whitespace-nowrap">{t.tag}</span>
							<KJVButton classes="" onClick={() => onDeleteTag(t.id)}>
								<Delete classes=""></Delete>
							</KJVButton>
						</span>
					</span>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}
<!-- ================================ FOOTER =============================== -->
<!-- ============================== CONTAINER ============================== -->
{#snippet noteBody()}
	{#if showNoteActions}
		{#if !showConfirmDelete}
			{@render noteActionsSnippet()}
		{/if}
		{#if showConfirmDelete}
			{@render noteConfirmDeleteSnippet()}
		{/if}
	{:else}
		<div
			bind:clientHeight={tagContainerHeight}
			class="flex w-full flex-col items-start justify-start"
		>
			{@render noteTagInputSnippet()}
			{#if note?.tags}
				{@render noteTagsSnippet()}
			{/if}
		</div>
	{/if}
	<!-- keep the editor in the dom the while notes container is open. toggle the hidden params. Otherwise we'd need to keep creating this. -->
	<div
		class=" {showNoteActions || !note
			? 'hidden'
			: ''} flex w-full min-h-0 min-w-0 flex-col overflow-hidden"
		style="height: {Math.max(
			0,
			clientHeight - headerHeight - tagContainerHeight - 50
		)}px"
	>
		<div
			id={editor}
			class="notes-quill h-full w-full min-h-0 min-w-0 overflow-hidden"
		></div>
	</div>
{/snippet}

<BufferHeader bind:headerHeight>
	{@render noteHeaderSnippet()}
</BufferHeader>
<div style="height: {clientHeight - headerHeight}px">
	{@render noteBody()}
</div>

<style>
	:global(.notes-quill.ql-container) {
		box-sizing: border-box;
		height: 100%;
		width: 100%;
		max-width: 100%;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}

	:global(.notes-quill > .ql-editor) {
		box-sizing: border-box;
		height: 100%;
		width: 100%;
		max-width: 100%;
		min-height: 0;
		min-width: 0;
		overflow-x: hidden;
		overflow-y: auto;
		overflow-wrap: anywhere;
	}
</style>
