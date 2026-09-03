<script lang="ts">
	import type { Relay } from '$lib/nostr/services/constants.service';
	import { readRelays, writeRelays } from '$lib/nostr/stores/Author';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	let relays: Relay[] = $state([]);

	onMount(() => {
		concatReadAndWriteRelays();
	});

	function concatReadAndWriteRelays() {
		let relayMap: { [key: string]: Relay } = {};
		concatReadRelays(relayMap);
		concatWriteRelays(relayMap);
		Object.values(relayMap).forEach((r) => {
			relays.push(r);
		});
	}

	function concatReadRelays(relayMap: { [key: string]: Relay }) {
		let rr = get(readRelays);
		rr.forEach((r: string) => {
			if (relayMap[r]) {
				relayMap[r].read = true;
			} else {
				relayMap[r] = { url: r, read: true, write: false };
			}
		});
	}

	function concatWriteRelays(relayMap: { [key: string]: Relay }) {
		let wr = get(writeRelays);

		wr.forEach((r: string) => {
			if (relayMap[r]) {
				relayMap[r].write = true;
			} else {
				relayMap[r] = { url: r, write: true, read: false };
			}
		});
	}
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
