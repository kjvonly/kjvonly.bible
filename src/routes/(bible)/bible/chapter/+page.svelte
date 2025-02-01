<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';

	import { onMount } from 'svelte';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapterContainer.svelte';
	import { paneService } from '../../../../lib/services/pane.service';

	//paneService.splitPane(paneService.rootPane, PaneSplit.Horizontal, 'ChapterContainer')

	let pane: Pane | undefined = $state(new Pane());
	
	onMount(( ) => {
		pane = paneService.rootPane
		paneService.onUpdate = (p: Pane) => {
			pane = Object.assign({}, p)
		}
	})
</script>

{#if pane}
	<div class="flex h-full w-full flex-col">
		<RecursivePane id={pane.id} bind:pane={pane}></RecursivePane>
	</div>
{/if}
