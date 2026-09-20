<script lang="ts">
	import uuid4 from 'uuid4';
	import Notes from './notes.svelte';
	import { onMount } from 'svelte';
	import type { NotesMode } from '$lib/domains/notes';
	let id = uuid4();
	let noteID: string = $state('');
	let { paneID = $bindable<string>(), pane = $bindable() } = $props();

	let mode: NotesMode = $state({
		bibleLocationRef: undefined as string | undefined,
		notePopup: { show: false },
		paneID: paneID
	});

	onMount(() => {
		if (pane.buffer && pane.buffer.bag) {
			noteID = pane.buffer.bag.noteID;
		}
	});
</script>

<div class="kjvonly-noselect h-full overflow-hidden">
	<div {id} class="h-full">
		<Notes allNotes={true} bind:mode noteIDToOpen={noteID}></Notes>
	</div>
</div>
