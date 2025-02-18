<script lang="ts">
	import type { Pane } from '$lib/models/pane.model';
	import { paneService } from '$lib/services/pane.service.svelte';
	import uuid4 from 'uuid4';
	import NotesContainer from './notesContainer.svelte';

	let id = uuid4();
	let {
		paneId = $bindable<string>(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();


    let mode ={
        chapterKey: '0_0_0_0',
		notePopup: { show: false  }, 
        paneId: paneId
    }
	let pane: Pane | any = $state();
	$effect(() => {
		paneId;
		pane = paneService.findNode(paneService.rootPane, paneId);
	});
</script>

<div class="kjvonly-noselect overflow-hidden">
	<div {id} style="{containerHeight} {containerWidth}">
        <NotesContainer annotations={{}} allNotes={true} containerHeight={containerHeight} ></NotesContainer>

    </div>
</div>
