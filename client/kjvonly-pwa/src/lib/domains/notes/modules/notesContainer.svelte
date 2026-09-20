<script lang="ts">
	import { BufferContainer } from '$lib/application/ui';
	import Notes from './notes.svelte';
	import { onMount } from 'svelte';
	import type { NotesMode } from '../models/note.model';
	let clientHeight = $state(0);
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

<BufferContainer bind:clientHeight>
	<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0 overflow-hidden">
		<Notes
			allNotes={true}
			bind:mode
			noteIDToOpen={noteID}
			{clientHeight}
		></Notes>
	</div>
</BufferContainer>
