<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';
	import { paneService } from '$lib/services/pane.service';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapterContainer.svelte';

	let pane = new Pane();

	pane = new Pane();	
	paneService.splitPane(pane, PaneSplit.Horizontal, 'ChapterContainer')

</script>

<div class="flex h-full w-full flex-col">
	<RecursivePane id={pane.id} bind:pane></RecursivePane>
</div>
