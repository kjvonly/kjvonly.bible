<script lang="ts">
	import Notes from './notes.svelte';
	import { onMount } from 'svelte';
	import type { NotesMode } from '../models/note.model';
	let noteID: string = $state('');
	let { paneID = $bindable<string>(), pane = $bindable() } = $props();

	let mode: NotesMode = $state({
		bibleLocationRef: undefined as string | undefined,
		notePopup: { show: false }
	});

	onMount(() => {
		if (pane.buffer && pane.buffer.bag) {
			noteID = pane.buffer.bag.noteID;
		}
	});
</script>

<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0 overflow-hidden">
	<Notes
		allNotes={true}
		{paneID}
		bind:mode
		noteIDToOpen={noteID}
	></Notes>
</div>
