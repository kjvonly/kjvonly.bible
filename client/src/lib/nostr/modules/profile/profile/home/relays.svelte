<script lang="ts">
	import { authorService } from '$lib/nostr/services/author.service';
	import type { Relay } from '$lib/nostr/services/constants.service';
	import { onMount } from 'svelte';

	let relays: Relay[] = $state([]);

	onMount(() => {
		relays = authorService.allRelays;
	});
</script>

{#snippet read(r: Relay)}
	{#if r.read || (!r.read && !r.write)}
		<span class="px-2">read</span>
	{:else}
		<span class="invisible px-2">read</span>
	{/if}
{/snippet}

{#snippet write(r: Relay)}
	{#if r.write}
		<span class="px-2">write</span>
	{:else}
		<span class="invisible px-2">write</span>
	{/if}
{/snippet}

<div class="w-full">
	<p class="capitalize underline">Relays</p>

	<div class="grid grid-cols-3 space-y-3 overflow-x-scroll ps-2.5">
		{#each relays as r}
			<div class="col-span-2 break-words">
				{r.url}
			</div>
			<p class="col-span-1 justify-self-end">
				{@render read(r)}
				{@render write(r)}
			</p>
		{/each}
	</div>
</div>
