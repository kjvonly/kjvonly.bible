<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let { containerHeight, notePopup = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let editor = uuid4().replaceAll('-', '');
	let note;
	let chapterNotes: any;
	let quill: Quill;
	let verseIdx = 0;
	let wordIdx = 0;
	let booknames: any = {};
	onMount(async () => {
		let element = document.getElementById(editor);

		booknames = await chapterService.getBooknames();
		chapterNotes = await chapterService.getNotes(notePopup.chapterKey);
		let keys = notePopup.chapterKey?.split('_');

		if (keys?.length > 3) {
			verseIdx = keys[2];
			if (!chapterNotes[verseIdx]) {
				chapterNotes[verseIdx] = {
					words: {}
				};
			}

			wordIdx = keys[3];
			if (!chapterNotes[verseIdx].words[wordIdx]) {
                let chapter = await chapterService.getChapter(notePopup.chapterKey);
                let verse = chapter['verseMap'][verseIdx]

				let title = `${booknames['booknamesById'][keys[0]]} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;
				chapterNotes[verseIdx].words[wordIdx] = [{ text: '', html: `<h1>${title}</h1><p><italic>${verse}</italic></p>` }];
			}
		} else {
			console.log('error chapterKey does not contain verse and wordIdx');
		}
		note = chapterNotes[verseIdx].words[wordIdx][0];
		console.log(note.html);

		if (element) {
			quill = new Quill(element, {
				theme: 'snow'
			});

			quill.on('text-change', (delta, oldDelta, source) => {
				if (source == 'api') {
					console.log('An API call triggered this change.');
				} else if (source == 'user') {
					console.log('A user action triggered this change.', quill.getSemanticHTML());
				}
			});

			let d = quill.clipboard.convert({ html: note.html });
			console.log(d);

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
		class=" w-full max-w-lg flex-row bg-neutral-100 text-neutral-700"
	>
		<button
			onclick={() => {
				notePopup.show = false;
			}}
			class="float-end px-2 pt-2 text-neutral-700">Cancel</button
		>
	</header>

	<div
		style="height: {clientHeight - headerHeight}px"
		class="flex w-full max-w-lg flex-col overflow-y-scroll border"
	>
		<p>notes</p>
		<p>{notePopup.chapterKey}</p>
		<!-- Create the editor container -->
		<div id={editor}></div>
	</div>
</div>
