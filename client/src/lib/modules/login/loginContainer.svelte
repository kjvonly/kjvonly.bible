<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';

	// MODELS
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { authService } from '$lib/services/auth.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { toastService } from '$lib/services/toast.service';
	import { onMount } from 'svelte';
	import LoginHeader from './loginHeader.svelte';
	import LoginOptions from './unauthed/loginOptions.svelte';
	import { localStorageService } from '$lib/nostr/services/localStorage.service';
	import { identityService } from '$lib/nostr/services/identity.service';
	import NsecLogin from './unauthed/nsecLogin.svelte';

	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable(),
		onClose = undefined
	} = $props();

	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);

	onMount(async () => {
		let authenticated = await hasIdentity();
		if (authenticated) {
		}
	});

	async function hasIdentity(): Promise<boolean> {
		const storedIdentity = identityService.getIdentity();
		console.debug('[loginContainer storedIdentites]', storedIdentity);

		if (storedIdentity === null) {
			return false;
		}

		return true;
	}
</script>

{#snippet body()}
	<!-- <LoginOptions></LoginOptions> -->
	<NsecLogin></NsecLogin>
{/snippet}
{#snippet header()}
	<LoginHeader {paneID} bind:clientHeight></LoginHeader>
{/snippet}

<!-- ============================== CONTAINER ============================== -->

<BufferContainer bind:clientHeight>
	<BufferHeader
		bind:headerHeight
		classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
	>
		{@render header()}
	</BufferHeader>
	<BufferBody bind:clientHeight bind:headerHeight>
		{@render body()}
	</BufferBody>
</BufferContainer>
