<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import FootnoteContainer from '../footnote/footnoteContainer.svelte';
	import uuid4 from 'uuid4';

	let id = uuid4();
	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

	let strongsRefs: string[] = $state([]);
	let footnote = $state('');
	let verseRefs: string[] = $state([])
	let text = $state('');
	let pane: any = $state();

	onMount(() => {
		pane = paneService.findNode(paneService.rootPane, paneId);
		
		
		if(pane?.buffer?.bag?.currentVerseRef) {
			verseRefs.push(pane?.buffer?.bag?.currentVerseRef)
		}


		pane?.buffer?.bag?.word?.href?.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);
			
			if (match) {
				strongsRefs.push(ref);
			}

			match = new RegExp('\\d+_\\d+_\\d+', 'gm').test(ref);
			if (match) {
				footnote = ref;
			}

			match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
			if (match) {
				verseRefs.push(ref)
			}
		});
		

		if (pane?.buffer?.bag?.word?.text) {
			text = pane.buffer.bag.word.text.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		}
	});
</script>

<div id="{id}-container" class="relative flex h-full w-full overflow-hidden">
	<div {id} style={containerHeight} class="relative w-full overflow-y-scroll">
		<div class="h-full w-full">
			<div class="flex flex-col items-center">
				<div class="sticky top-0 w-full bg-neutral-100 max-w-lg">
					<div class="flex w-full">
						<span class="flex-grow"></span>
						<button
							onclick={() => {
								paneService.onDeletePane(paneService.rootPane, paneId);
							}}
							class="text-neutral-700 pe-4">Close</button
						>
					</div>
				</div>

				<div class="px-4 flex w-full max-w-lg">
					<div class="">
						{#if footnote.length > 0}
							<FootnoteContainer {text} {footnote} footnotes={pane?.buffer?.bag?.footnotes}
							></FootnoteContainer>
						{/if}

						{#if strongsRefs.length > 0}
							<StrongsRefsContainer {text} {strongsRefs}></StrongsRefsContainer>
						{/if}

						{#if verseRefs.length > 0}
							<VerseRefsContainer paneId={pane?.id}  {verseRefs}></VerseRefsContainer>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
