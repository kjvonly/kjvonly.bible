<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model';

	import { onMount } from 'svelte';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapter/chapterContainer.svelte';
	import { paneService } from '../../../../lib/services/pane.service';
	import { componentMapping } from '$lib/services/component-mapping.service';

	//paneService.splitPane(paneService.rootPane, PaneSplit.Horizontal, 'ChapterContainer')

	let pane: Pane | undefined = $state();
	
	onMount(( ) => {
		pane = paneService.rootPane
		componentMapping.map(pane);


		paneService.onUpdate = (p: Pane) => {
			componentMapping.map(p);
			pane = Object.assign({}, p)
		}
	})
</script>

{#if pane}
	<div class="flex h-full w-full flex-col">
		<RecursivePane bind:pane={pane}></RecursivePane>
	</div>
{/if}
