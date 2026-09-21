<script lang="ts">
	import Notes from './notes.svelte';
	import type { Pane } from '$lib/application';
	import type { NotesMode } from '../models/note.model';
	let {
		paneID,
		pane = $bindable<Pane>()
	}: {
		paneID: string;
		pane: Pane;
	} = $props();

	let mode: NotesMode = $state({
		bibleLocationRef: undefined,
		notePopup: { show: false }
	});

	// The Buffer bag is startup context for this Notes instance, not live state.
	const noteID = pane.buffer?.bag.noteID ?? '';
</script>

<!--
	Notes is also embedded directly by the Bible popup, which bypasses this
	module container. Keep BufferContainer ownership in Note/NotesList so both
	entry paths receive the same buffer presentation shell. Unlike most module
	containers, this wrapper must also remain unclipped so the child
	BufferContainer outline can render normally.
-->
<div class="kjvonly-noselect h-full w-full min-h-0 min-w-0">
	<Notes
		allNotes={true}
		{paneID}
		bind:mode
		noteIDToOpen={noteID}
	></Notes>
</div>
