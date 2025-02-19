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
	let footnotes: string[] = $state([]);
	let verseRefs: string[] = $state([]);
	let text = $state('');
	let pane: any = $state();

	onMount(() => {
		pane = paneService.findNode(paneService.rootPane, paneId);

		let refs: string[] = [];
		if (pane?.buffer?.bag?.refs) {
			refs = pane?.buffer?.bag?.refs;
		} else {
			if (pane?.buffer?.bag?.word?.href) {
				refs = pane?.buffer?.bag?.word?.href;
			}
		}

		refs.forEach((ref: string) => {
			let match = new RegExp('^[GH]', 'm').test(ref);

			if (match) {
				strongsRefs.push(ref);
			}

			match = new RegExp('\\d+_\\d+_\\d+', 'gm').test(ref);
			if (match) {
				footnotes.push(ref);
			}

			match = new RegExp('\\d+\/\\d+\/\\d+', 'gm').test(ref);
			if (match) {
				verseRefs.push(ref);
			}
		});

		if (verseRefs.length > 0) {
			if (pane?.buffer?.bag?.currentVerseRef) {
				verseRefs = [pane?.buffer?.bag?.currentVerseRef, ...verseRefs];
			}
		}

		if (pane?.buffer?.bag?.word?.text) {
			text = pane.buffer.bag.word.text.replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		}
	});
</script>

<div id="{id}-container" class="relative flex h-full w-full overflow-hidden">
	<div {id} style={containerHeight} class="relative w-full overflow-y-scroll">
		<div class="h-full w-full">
			<div class="flex flex-col items-center">
				<div class="sticky top-0 w-full max-w-lg bg-neutral-100">
					<div class="flex w-full">
						<span class="flex-grow"></span>
						<button
							aria-label="close"
							onclick={() => {
								paneService.onDeletePane(paneService.rootPane, paneId);
							}}
							class="h-12 w-12 px-2 pt-2 text-neutral-700"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								width="100%"
								height="100%"
							>
								<path
									class="fill-neutral-700"
									d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
								/>
							</svg>
						</button>
					</div>
				</div>

				<div class="flex w-full max-w-lg px-4">
					<div class="">
						{#if footnotes.length > 0}
							<FootnoteContainer
								isVerseRef={pane?.buffer?.bag?.refs !== undefined}
								{footnotes}
								chapterFootnotes={pane?.buffer?.bag?.footnotes}
							></FootnoteContainer>
						{/if}

						{#if strongsRefs.length > 0}
							<StrongsRefsContainer
								isVerseRef={verseRefs.length > 0}
								strongsWords={pane?.buffer?.bag?.strongsWords}
								{text}
								{strongsRefs}
							></StrongsRefsContainer>
						{/if}

						{#if verseRefs.length > 0}
							<VerseRefsContainer paneId={pane?.id} {verseRefs}></VerseRefsContainer>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
