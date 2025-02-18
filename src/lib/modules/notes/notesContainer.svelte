<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { toastService } from '$lib/services/toast.service';
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let { containerHeight, mode = $bindable(), annotations = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let editor = uuid4().replaceAll('-', '');
	let note: any;
	let quill: Quill;
	let verseIdx = 0;
	let wordIdx = 0;
	let booknames: any = {};
	let title = $state('');
	let showNoteActions = $state(false);
	let noteID: string = '';
	let showConfirmDelete = $state(false);

	let noteActions: any = {
		delete: () => {
			showConfirmDelete = true;
		}
	};

	async function onConfirmDelete() {
		delete annotations[verseIdx].notes.words[wordIdx][noteID];
		await chapterService.putAnnotations(JSON.parse(JSON.stringify(annotations)));
		mode.notePopup.show = false;
	}

	async function onSave() {
		annotations[verseIdx].notes.words[wordIdx][noteID] = note;
		await chapterService.putAnnotations(JSON.parse(JSON.stringify(annotations)));
		toastService.showToast(`saved ${title}`);
	}

	onMount(async () => {
		let element = document.getElementById(editor);

		booknames = await chapterService.getBooknames();
		let keys = mode.chapterKey?.split('_');
		title = `${booknames['shortNames'][keys[0]]} ${keys[1]}:${keys[2]}${keys[3] > 0 ? ':' + keys[3] : ''}`;
		if (keys?.length > 3) {
			verseIdx = keys[2];
			if (!annotations[verseIdx]) {
				annotations[verseIdx] = {};
			}

			if (!annotations[verseIdx].notes) {
				annotations[verseIdx].notes = {};
			}

			if (!annotations[verseIdx].notes.words) {
				annotations[verseIdx].notes.words = {};
			}

			wordIdx = keys[3];
			if (
				!annotations[verseIdx].notes.words[wordIdx] ||
				Object.keys(annotations[verseIdx].notes.words[wordIdx]).length === 0
			) {
				let chapter = await chapterService.getChapter(mode.chapterKey);
				let verse = chapter['verseMap'][verseIdx];
				noteID = uuid4();
				let now = Date.now();
				annotations[verseIdx].notes.words[wordIdx] = {};
				annotations[verseIdx].notes.words[wordIdx][noteID] = {
					text: `${title}\n${verse}`,
					html: `<h1>${title}</h1><p><italic>${verse}</italic></p>`,
					created: now,
					modified: now
				};
			}
		} else {
			console.log('error chapterKey does not contain verse and wordIdx');
		}

		let notes = annotations[verseIdx].notes.words[wordIdx];
		let noteKeys = Object.keys(notes).sort((a, b) => {
			return notes[a].modified - notes[b].modified;
		});
		noteID = noteKeys[0];

		note = annotations[verseIdx].notes.words[wordIdx][noteID];

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
	{#if note}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
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
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<p
				onclick={() => {
					showNoteActions = !showNoteActions;
				}}
				class="hover:cursor-pointer"
			>
				<span class="inline-block font-bold">{title}</span>
				<button aria-label="chevron down" class="h-4 w-4">
					<svg
						width="100%"
						height="100%"
						viewBox="0 0 25.4 14.098638"
						version="1.1"
						xml:space="preserve"
						xmlns="http://www.w3.org/2000/svg"
						><g transform="translate(-53.644677,-127.79211)"
							><path
								class="fill-neutral-700"
								style="stroke-width:0.352778"
								d="m 59.906487,137.65245 -6.26181,-4.21622 v -2.82206 -2.82206 l 6.35,4.24282 6.35,4.24283 6.35,-4.24283 6.35,-4.24282 v 2.82222 2.82222 l -6.3429,4.23808 c -3.48859,2.33094 -6.38578,4.22817 -6.43819,4.21606 -0.0524,-0.0121 -2.91311,-1.91931 -6.3571,-4.23824 z"
								id="path179"
							/></g
						></svg
					>
				</button>
			</p>
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

		{#if showNoteActions}
			{#if !showConfirmDelete}
				<div
					class="flex h-full w-full max-w-lg flex-col items-start justify-start border border-neutral-100"
				>
					{#each Object.keys(noteActions) as na}
						<button
							class="w-full py-4 ps-2 text-left capitalize hover:bg-primary-50"
							aria-label="note action button"
							onclick={() => noteActions[na]()}
						>
							{na}
						</button>
					{/each}
				</div>
			{/if}
			{#if showConfirmDelete}
				<div
					class="flex h-full w-full max-w-lg flex-col items-center justify-center border border-neutral-100"
				>
					<p class="p-4 capitalize">confirm delete <span class="font-semibold">{title}</span></p>
					<div class="flex flex-row space-x-5">
						<button
							onclick={() => {
								onConfirmDelete();
							}}
							aria-label="delete button"
							class="rounded-lg bg-neutral-100 p-4 capitalize hover:bg-primary-50">delete</button
						>
						<button
							onclick={() => {
								showConfirmDelete = false;
							}}
							aria-label="cancel button"
							class="rounded-lg bg-neutral-100 p-4 capitalize hover:bg-primary-50">cancel</button
						>
					</div>
				</div>
			{/if}
		{/if}

		<div
			style="height: {clientHeight - headerHeight}px"
			class=" {showNoteActions
				? 'hidden'
				: ''} flex w-full max-w-lg flex-col overflow-y-scroll border"
		>
			<!-- Create the editor container -->
			<div id={editor}></div>
		</div>
	{:else}
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
				class="p-0.5"
					version="1.1"
					width="100%"
					height="100%"
					viewBox="0 0 105.50072 106.78786"
					xmlns="http://www.w3.org/2000/svg"
					
				>
					
					<g id="g8" transform="translate(-11.214067,-10.602166)">
						<path
							class="fill-neutral-700"
							style="stroke-width:4.20363;stroke-linejoin:round"
							d="M 63.952348,10.627557 A 52.737736,53.368481 0 0 0 11.214067,63.996697 52.737736,53.368481 0 0 0 63.952348,117.36388 52.737736,53.368481 0 0 0 116.68868,63.996697 52.737736,53.368481 0 0 0 63.952348,10.627557 Z m -4.40625,34.925781 h 8.884766 v 14.335937 h 12.917969 v 8.138672 H 68.430864 V 82.438103 H 59.546098 V 68.027947 H 46.553911 v -8.138672 h 12.992187 z"
						/>
					</g>
				</svg>
			</button>
			<p>Notes</p>
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
	{/if}
</div>
