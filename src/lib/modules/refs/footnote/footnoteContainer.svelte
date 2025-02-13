<script lang="ts">
	import { json } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	let { footnotes, chapterFootnotes } = $props();

	let fs: any[] = $state([]);
	onMount(() => {
		console.log('footnotes', footnotes);
		footnotes.forEach((f: any) => {
			let key = f?.split('_')[2];
			fs.push({ key: String.fromCharCode(parseInt(key) + 96), html: chapterFootnotes[key] });
		});
	});
</script>

{#if fs.length > 0}
	<div class="flex flex-col pt-6">
		{#each fs as f}
			<p>
				<span class="italic">{f['key']} </span>
				{@html f['html']}
			</p>
		{/each}
	</div>
{/if}
