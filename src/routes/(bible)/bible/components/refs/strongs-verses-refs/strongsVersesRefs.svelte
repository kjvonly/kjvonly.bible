<script lang="ts">
	import { onMount } from 'svelte';
	import Container from '../../../../components/container.svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { getParentHeight } from '$lib/utils/height';

	let id = crypto.randomUUID();
	let { pane } = $props();

	let strongsRef = $state('');
	let containerHeight: number = $state(0);
	onMount(() => {
		containerHeight = getParentHeight(id);
		pane?.buffer?.bag?.word?.href?.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);
			if (match) {
				strongsRef = ref;
			}
		});
	});
</script>

<Container>
	<div id="{id}-container" class="relative overflow-hidden h-full">
		<div id={id} style="height: {containerHeight}px;" class="max-w-sm overflow-y-scroll md:z-10 md:max-w-lg">
			{#if strongsRef.length > 0}
				<StrongsRefsContainer {strongsRef}></StrongsRefsContainer>
			{/if}
			<VerseRefsContainer></VerseRefsContainer>
		</div>
	</div>
</Container>
