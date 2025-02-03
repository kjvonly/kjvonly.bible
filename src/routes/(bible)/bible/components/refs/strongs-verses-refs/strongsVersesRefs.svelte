<script lang="ts">
	import { onMount } from 'svelte';
	import Container from '../../../../components/container.svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { getParentHeight } from '$lib/utils/height';
	import { paneService } from '../../../../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let id = crypto.randomUUID();
	let { paneId } = $props();

	let strongsRef = $state('');
	let text = $state('')
	let containerHeight: number = $state(0);
	onMount(() => {
		let pane = paneService.findNode(paneService.rootPane, paneId)
		console.log('word pane', pane)
		containerHeight = getParentHeight(id);
		pane?.buffer?.bag?.word?.href?.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);
			if (match) {
				strongsRef = ref;
			}
		});

		if (pane?.buffer?.bag?.word?.text){
			
			text = pane.buffer.bag.word.text.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		}
	});
</script>

<div id="{id}-container" class="relative flex h-full overflow-hidden">
	<div {id}  class="relative overflow-y-scroll">
		<div class="flex h-full w-full justify-center">

			<div class="max-w-6xl">
				test
				{#if strongsRef.length > 0}
					<StrongsRefsContainer {text} {strongsRef}></StrongsRefsContainer>
				{/if}
				<VerseRefsContainer></VerseRefsContainer>
			</div>
		</div>
	</div>
</div>
