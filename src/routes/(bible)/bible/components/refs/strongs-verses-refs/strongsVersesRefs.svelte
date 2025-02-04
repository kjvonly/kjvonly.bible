<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Container from '../../../../components/container.svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { getParentHeight } from '$lib/utils/height';
	import { paneService } from '../../../../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let id = crypto.randomUUID();
	let { paneId } = $props();

	let strongsRef = $state('');
	let text = $state('');
	let containerHeight: string = $state('');



	function updateHw(hw: any){
		console.log('hw', hw[paneId])
		containerHeight = `height: ${hw[paneId].height * 100}vh;`
	}


	onMount(() => {
		let pane = paneService.findNode(paneService.rootPane, paneId);
		paneService.subscribe(paneId, updateHw)
		updateHw(paneService.hw)

		console.log('word pane', pane);
		pane?.buffer?.bag?.word?.href?.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);
			if (match) {
				strongsRef = ref;
			}
		});

		if (pane?.buffer?.bag?.word?.text) {
			text = pane.buffer.bag.word.text.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		}
	});

	onDestroy(() => {
		paneService.unsubscribe(paneId)
	})
</script>

<div id="{id}-container" class="relative flex h-full w-full overflow-hidden">
	<div {id} style="{containerHeight}" class="relative w-full overflow-y-scroll">
		<div class="flex h-full w-full justify-center">
			<div class="max-w-6xl">
				{#if strongsRef.length > 0}
					<StrongsRefsContainer {text} {strongsRef}></StrongsRefsContainer>
				{/if}
				<VerseRefsContainer></VerseRefsContainer>
			</div>
		</div>
	</div>
</div>
