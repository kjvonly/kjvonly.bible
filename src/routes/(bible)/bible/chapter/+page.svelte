<script lang="ts">
	import { Pane, PaneSplit } from '$lib/models/pane.model.svelte';

	import { onMount } from 'svelte';
	import RecursivePane from '../../../../components/recursive-pane/recursive-pane.svelte';
	import ChapterContainer from '../components/chapter/chapterContainer.svelte';
	import { paneService } from '../../../../lib/services/pane.service.svelte';
	import { componentMapping } from '$lib/services/component-mapping.service';

	//paneService.splitPane(paneService.rootPane, PaneSplit.Horizontal, 'ChapterContainer')

	let obj: any = $state({});

	onMount(() => {
		obj.obj = [paneService.rootPane];
		componentMapping.map(obj.obj[0]);
		paneService.onUpdate = (p: Pane) => {
			componentMapping.map(obj.obj[0]);
			obj.obj = [p]
		};
	});
</script>

{#if obj.obj}
{#each obj.obj as  p, idx}
	<div class="flex h-full w-full flex-col">
		<RecursivePane bind:pane={obj.obj[idx]}></RecursivePane>
	</div>
	{/each}
{/if}
