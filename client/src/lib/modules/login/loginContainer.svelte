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
	import LoginHeader from './loginHeader.svelte';
	import LoginOptions from './unauthed/loginOptions.svelte';

	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable(),
		onClose = undefined
	} = $props();

	let clientHeight: number = $state(0);
	let headerHeight: number = $state(0);

	async function onsubmit() {
		let isSuccessful = await authService.login(email, password);
		if (!isSuccessful) {
			toastService.showToast('Error logging in');
		} else {
			toastService.showToast('Login Success');
		}
		pane.updateBuffer(Modules.BIBLE);
	}
</script>

{#snippet body()}
	<LoginOptions></LoginOptions>
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
