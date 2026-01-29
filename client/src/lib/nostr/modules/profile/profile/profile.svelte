<script lang="ts">
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import { authService } from '$lib/nostr/services/auth.service';
	import { onMount } from 'svelte';
	import ProfileHeader from './profileHeader.svelte';

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	} = $props();

	let headerHeight: number = $state(0);

	onMount(() => {});
</script>

{#snippet header()}
	<ProfileHeader {paneID} bind:navService bind:clientHeight={headerHeight}
	></ProfileHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">profile</div>
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
