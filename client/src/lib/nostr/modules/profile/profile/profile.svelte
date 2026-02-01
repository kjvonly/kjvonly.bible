<script lang="ts">
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import { onMount } from 'svelte';
	import ProfileHeader from './profileHeader.svelte';
	import { authorService } from '$lib/nostr/services/author.service';
	import { nip19 } from 'nostr-tools';
	import Pubkey from './components/pubkey.svelte';
	import Relays from './components/relays.svelte';

	let {
		paneID,
		obj = $bindable(),
		clientHeight = $bindable(),
		navService = $bindable()
	} = $props();

	let headerHeight: number = $state(0);
</script>

{#snippet header()}
	<ProfileHeader {paneID} bind:navService bind:clientHeight={headerHeight}
	></ProfileHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-start justify-start space-y-2">
		<Pubkey></Pubkey>
		<Relays></Relays>
	</div>
{/snippet}

<BufferHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{@render header()}
</BufferHeader>
<BufferBody bind:clientHeight bind:headerHeight>
	{@render body()}
</BufferBody>
