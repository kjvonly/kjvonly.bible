<script lang="ts">
	import type { Pane } from '$lib/models/pane.model';
	import { paneService } from '$lib/services/pane.service.svelte';
	import uuid4 from 'uuid4';
	import NotesContainer from './notesContainer.svelte';
	import { onMount, untrack } from 'svelte';

	let id = uuid4();
	let noteID: string = $state('');
	let {
		paneId = $bindable<string>(),
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();

	let mode = $state({
		chapterKey: '0_0_0_0',
		notePopup: { show: false },
		paneId: paneId
	});

	onMount(() => {
		if (pane.buffer && pane.buffer.bag) {
			noteID = pane.buffer.bag.noteID;
		}
	});
</script>

<div class="kjvonly-noselect overflow-hidden">
	<div {id} style="{containerHeight} {containerWidth}">
		<NotesContainer
			annotations={{}}
			allNotes={true}
			{containerHeight}
			bind:mode
			noteIDToOpen={noteID}
		></NotesContainer>
	</div>
</div>
