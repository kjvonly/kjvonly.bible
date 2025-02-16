<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { text } from '@sveltejs/kit';
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let { containerHeight, mode = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let editor = uuid4().replaceAll('-', '');
	let note: any;
	let chapterNotes: any;
	let quill: Quill;
	let verseIdx = 0;
	let wordIdx = 0;
	let booknames: any = {};
	let title = $state('');

	async function onSave() {
		chapterNotes[verseIdx].words[wordIdx][0] = note;
		await chapterService.putNotes(chapterNotes);
		mode?.notePopup?.onSaveNotes();
	}

	onMount(async () => {
		let element = document.getElementById(editor);

		booknames = await chapterService.getBooknames();
		chapterNotes = await chapterService.getNotes(mode.chapterKey);
		let keys = mode.chapterKey?.split('_');
		title = `${booknames['shortNames'][keys[0]]} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;
		if (keys?.length > 3) {
			verseIdx = keys[2];
			if (!chapterNotes[verseIdx]) {
				chapterNotes[verseIdx] = {
					words: {}
				};
			}

			wordIdx = keys[3];
			if (!chapterNotes[verseIdx].words[wordIdx]) {
				let chapter = await chapterService.getChapter(mode.chapterKey);
				let verse = chapter['verseMap'][verseIdx];
				chapterNotes[verseIdx].words[wordIdx] = {
					'0': { text: `${title}\n${verse}`, html: `<h1>${title}</h1><p><italic>${verse}</italic></p>` }
				};
			}
		} else {
			console.log('error chapterKey does not contain verse and wordIdx');
		}

		note = chapterNotes[verseIdx].words[wordIdx]['0'];

		if (element) {
			quill = new Quill(element, {
				theme: 'snow'
			});

			quill.on('text-change', (delta, oldDelta, source) => {
				if (source == 'api') {
					console.log('An API call triggered this change.');
				} else if (source == 'user') {
					note.html = quill.getSemanticHTML();
					note.text = quill.getText();
				}
			});

			let d = quill.clipboard.convert({ html: note.html });
			quill.setContents(d, 'silent');
		}
	});
</script>

<div
	bind:clientHeight
	style={containerHeight}
	class="flex h-full w-full flex-col items-center bg-neutral-50"
>
	<header
		bind:clientHeight={headerHeight}
		class=" flex w-full max-w-lg flex-row items-center justify-between bg-neutral-100 text-neutral-700"
	>
		<button
			aria-label="close"
			onclick={() => {
				onSave();
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg
				version="1.1"
				id="svg2"
				width="100%"
				height="100%"
				viewBox="0 0 96.130432 96"
				xmlns="http://www.w3.org/2000/svg"
			>
				<g id="g8" transform="translate(-16,-16)">
					<path
						class="fill-neutral-700"
						style="stroke-width:1.33333"
						d="M 19.272727,108.72727 16,105.45455 V 64 22.545455 L 19.272727,19.272727 22.545455,16 h 33.641558 33.641559 l 11.150928,11.150928 11.15093,11.150928 -0.39855,34.302125 c -0.3976,34.220589 -0.40603,34.308179 -3.54626,36.849069 C 105.2389,111.83737 102.4042,112 63.791681,112 H 22.545455 Z m 55.9361,-12.654045 c 3.502058,-3.50206 4.124506,-5.122865 4.124506,-10.739892 0,-5.693716 -0.607301,-7.222686 -4.358974,-10.974358 C 71.222687,70.607301 69.693716,70 64,70 c -5.693716,0 -7.222687,0.607301 -10.974359,4.358975 -3.737012,3.73701 -4.358974,5.291226 -4.358974,10.892581 0,6.853933 3.398442,12.271284 9.333333,14.877974 4.985283,2.1896 12.806448,0.34607 17.208827,-4.056305 z M 78.4,46.4 c 2.077387,-2.077387 2.077387,-16.055947 0,-18.133333 -2.250848,-2.250848 -47.882485,-2.250848 -50.133333,0 -2.077387,2.077386 -2.077387,16.055946 0,18.133333 2.250848,2.250848 47.882485,2.250848 50.133333,0 z"
						id="path293"
					/>
				</g>
			</svg>
		</button>
		<span class="inline-block font-bold">{title}</span>
		<button
			aria-label="close"
			onclick={() => {
				mode.notePopup.show = false;
			}}
			class="h-12 w-12 px-2 pt-2 text-neutral-700"
		>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
				<path
					class="fill-neutral-700"
					d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
				/>
			</svg>
		</button>
	</header>

	<div
		style="height: {clientHeight - headerHeight}px"
		class="flex w-full max-w-lg flex-col overflow-y-scroll border"
	>
		<!-- Create the editor container -->
		<div id={editor}></div>
	</div>
</div>
