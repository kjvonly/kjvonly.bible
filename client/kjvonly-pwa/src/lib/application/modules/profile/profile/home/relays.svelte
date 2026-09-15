<script lang="ts">
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import type { NostrAccountRelay } from '$lib/infrastructure/nostr/account/nostr-account-relay-provider';

	const {
		nostrAccountStrategy
	} = useApplicationContext();

	let relays = $state<readonly NostrAccountRelay[]>([]);

	onMount(() => {
		return nostrAccountStrategy.subscribeRelays(
			(value) => {
				relays = value;
			}
		);
	});
</script>

{#snippet read(relay: NostrAccountRelay)}
	{#if relay.read}
		<span class="px-2">read</span>
	{:else}
		<span class="invisible px-2">read</span>
	{/if}
{/snippet}

{#snippet write(relay: NostrAccountRelay)}
	{#if relay.write}
		<span class="px-2">write</span>
	{:else}
		<span class="invisible px-2">write</span>
	{/if}
{/snippet}

<div class="w-full">
	<p class="capitalize underline">Relays</p>

	<div class="grid grid-cols-3 space-y-3 overflow-x-scroll ps-2.5">
		{#each relays as relay}
			<div class="col-span-2 break-words">
				{relay.url}
			</div>
			<p class="col-span-1 justify-self-end">
				{@render read(relay)}
				{@render write(relay)}
			</p>
		{/each}
	</div>
</div>
