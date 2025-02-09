<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import StrongsRefsContainer from '../strongs-refs/strongsRefsContainer.svelte';
	import VerseRefsContainer from '../verses-refs/verseRefsContainer.svelte';
	import { paneService } from '$lib/services/pane.service.svelte';
	import FootnoteContainer from '../footnote/footnoteContainer.svelte';

	let id = crypto.randomUUID();
	let { paneId, containerHeight = $bindable(), containerWidth = $bindable() } = $props();

	let strongsRef = $state('');
	let footnote = $state('');
	let verse = $state('')
	let verseRefs: string[] = $state([])
	let text = $state('');
	let pane: any = $state();

	onMount(() => {
		pane = paneService.findNode(paneService.rootPane, paneId);
		pane?.buffer?.bag?.word?.href?.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);
			if (match) {
				strongsRef = ref;
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
							class="text-neutral-700">Close</button
						>
					</div>
				</div>

				<div class="flex w-full max-w-lg">
					<div class="">
						{#if footnote.length > 0}
							<FootnoteContainer {text} {footnote} footnotes={pane?.buffer?.bag?.footnotes}
							></FootnoteContainer>
						{/if}

						{#if strongsRef.length > 0}
							<StrongsRefsContainer {text} {strongsRef}></StrongsRefsContainer>
						{/if}

						{#if verseRefs.length > 0}
							<VerseRefsContainer chapterKey={pane?.buffer?.bag?.chapterKey} verse={pane?.buffer?.bag?.verse} {verseRefs}></VerseRefsContainer>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
