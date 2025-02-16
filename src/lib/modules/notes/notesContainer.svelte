<script lang="ts">
	import Quill from 'quill';
	import { onMount } from 'svelte';
	import uuid4 from 'uuid4';

	let { containerHeight, notePopup = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let editor = uuid4().replaceAll('-', '');
	let value = $state('');
	let quill: Quill;

    let initalHtml = `<p>Hello&nbsp;World!</p><p>Some&nbsp;initial&nbsp;<strong>bold</strong>&nbsp;text</p><p>abc hi world</p>`

	onMount(() => {
		let element = document.getElementById(editor);
		if (element) {
			quill = new Quill(element, {
				theme: 'snow'
			});

			quill.on('text-change', (delta, oldDelta, source) => {
				if (source == 'api') {
					console.log('An API call triggered this change.');
				} else if (source == 'user') {
					console.log('A user action triggered this change.', );
				}
			});
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
		<div id={editor}>
            {@html initalHtml}
		</div>
	</div>
</div>
