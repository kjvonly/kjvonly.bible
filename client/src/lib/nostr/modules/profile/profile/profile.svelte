<script lang="ts">
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import ProfileHeader from './profileHeader.svelte';
	import Pubkey from './home/pubkey.svelte';
	import Relays from './home/relays.svelte';

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
	<div class="flex h-full flex-col items-start justify-start space-y-2 py-4">
		<Pubkey></Pubkey>
		<Relays></Relays>
	</div>
{/snippet}

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody bind:clientHeight bind:headerHeight>
	{@render body()}
</BufferBody>
