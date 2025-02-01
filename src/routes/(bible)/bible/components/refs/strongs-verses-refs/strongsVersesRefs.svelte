<script lang="ts">
	import { onMount } from 'svelte';
	import Container from '../../../../components/container.svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { getParentHeight } from '$lib/utils/height';

	let id = crypto.randomUUID();
	let { pane } = $props();

	let strongsRef = $state('');
	let text = $state('')
	let containerHeight: number = $state(0);
	onMount(() => {
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

<div id="{id}-container" class="relative h-full overflow-hidden">
	<div {id} style="height: {containerHeight}px;" class="relative overflow-y-scroll">
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
