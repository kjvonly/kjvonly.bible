<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { paneService } from '../../../../../../components/dynamic-grid-template-areas/pane.service.svelte';

	let id = crypto.randomUUID();
	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

	let strongsRef = $state('');
	let text = $state('');

	onMount(() => {
		let pane = paneService.findNode(paneService.rootPane, paneId);

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
