<script lang="ts">
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { Modules } from '$lib/models/modules.model';
	import { identityService } from '$lib/nostr/services/identity.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import NsecLoginHeader from './nsecLoginHeader.svelte';

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	} = $props();

	let headerHeight: number = $state(0);

	let nsec = $state('');
	async function nsecLogin() {
		let success = await identityService.withNsec(nsec);
		if (success) {
			let pane = paneService.findNode(paneService.rootPane, paneID);
			if (pane) {
				pane?.updateBuffer(Modules.PROFILE);
			}
		}
	}
</script>

{#snippet header()}
	<NsecLoginHeader {paneID} bind:navService bind:clientHeight={headerHeight}
	></NsecLoginHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<p class="p-2">Input your nsec key</p>
		<div class="flex max-w-72 flex-col space-y-2">
			<input
				bind:value={nsec}
				type="text"
				id="nsecText"
				placeholder="nsec1..."
				class=" border-primary-500 w-full border-b-1 outline-none"
			/>
			<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
		</div>
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
