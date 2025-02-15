<script lang="ts">
	
	// import Editor from '@tinymce/tinymce-svelte';

	const quill = new Quill('#editor', {
		theme: 'snow'
	});

	let { containerHeight, notePopup = $bindable() } = $props();
	let clientHeight = $state(0);
	let headerHeight = $state(0);

	let value = $state('');
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
		<div id="editor">
			<p>Hello World!</p>
			<p>Some initial <strong>bold</strong> text</p>
			<p><br /></p>
		</div>
	</div>
</div>
