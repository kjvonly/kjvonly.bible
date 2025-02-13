<script lang="ts">
	import ChevronDown from '$lib/components/chevronDown.svelte';
	import { onMount } from 'svelte';

	let { isVerseRef, footnotes, chapterFootnotes } = $props();

	let fs: any[] = $state([]);
	let toggle = $state(false);
	
	onMount(() => {
		footnotes.forEach((f: any) => {
			let key = f?.split('_')[2];
			fs.push({ key: String.fromCharCode(parseInt(key) + 96), html: chapterFootnotes[key] });
		});
	});
</script>

{#if fs.length > 0}
	{#if fs.length > 1 || isVerseRef}
		<div class="flex flex-col pt-6">
			<div class="flex flex-row items-center">
				<p class="pe-4 capitalize">footnotes:</p>

				<button
					onclick={() => {
						toggle = !toggle;
					}}
					aria-label="toggle drop down"
				>
					<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
				</button>
			</div>
			{#if toggle}
				{#each fs as f}
					<div class="ps-2">
						<p class="flex flex-row items-center py-2">
							<span class="px-2 italic">{f['key']} </span>
							<button
								onclick={() => {
									f.toggle = !f.toggle;
								}}
								aria-label="toggle drop down"
							>
								<ChevronDown className="w-4 h-4" fill="fill-neutral-700"></ChevronDown>
							</button>
						</p>
						{#if f.toggle}
							<p class="ps-4">
								{@html f['html']}
							</p>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<div class="flex flex-row items-center py-2">
			<span class="px-2 italic">{fs[0]['key']} </span>

			<p class="ps-4">
				{@html fs[0]['html']}
			</p>
		</div>
	{/if}
{/if}
