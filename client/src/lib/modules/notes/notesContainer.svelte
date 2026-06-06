<script lang="ts">
	import type { Pane } from '$lib/models/pane.model';
	import { paneService } from '$lib/services/pane.service.svelte';
	import uuid4 from 'uuid4';
	import Notes from './notes.svelte';
	import { onMount, untrack } from 'svelte';

	let id = uuid4();
	let noteID: string = $state('');
	let { paneID = $bindable<string>(), pane = $bindable() } = $props();

	let mode = $state({
		bibleLocationRef: '0_0_0_0',
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
