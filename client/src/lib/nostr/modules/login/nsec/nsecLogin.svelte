<script lang="ts">
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { Modules } from '$lib/application/models/modules.model';
	import { Login } from '$lib/nostr/Login';
	import { loginService } from '$lib/nostr/services/login.service';
	import { paneService } from '$lib/application/services/pane.service.svelte';
	import NsecLoginHeader from './nsecLoginHeader.svelte';

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	} = $props();

	let headerHeight: number = $state(0);

	let nsec = $state('');
	let name = $state('');
	async function nsecLogin() {
		let login = new Login();
		await login.withNsec(nsec);
		await login.saveBasicInfo(name);
		let pane = paneService.findNode(paneService.rootPane, paneID);
		if (pane) {
			pane?.updateBuffer(Modules.PROFILE);
		}
	}
</script>

{#snippet header()}
	<NsecLoginHeader {paneID} bind:navService bind:clientHeight={headerHeight}
	></NsecLoginHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<div class="flex max-w-72 flex-col space-y-6">
			<input
				bind:value={name}
				type="text"
				id="name"
				placeholder="Name"
				class=" border-primary-500 w-full border-b-1 outline-none"
			/>
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
