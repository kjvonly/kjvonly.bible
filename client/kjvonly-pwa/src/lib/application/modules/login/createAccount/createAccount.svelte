<script lang="ts">
	import type { NavigationComponentProps } from '$lib/application/services/navigation.service';
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { Modules } from '$lib/application/models/modules.model';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import CreateAccountHeader from './createAccountHeader.svelte';

	let {
		paneID,
		clientHeight,
		obj = $bindable(),
		navService = $bindable()
	}: NavigationComponentProps = $props();

	const {
		authenticationService,
		accountService,
		workspaceRuntime
	} = useApplicationContext();

	let headerHeight: number = $state(0);
	let name = $state('');

	async function createAccount() {
		await authenticationService.createIdentity();

		await accountService.setup(
			authenticationService.getUserId(),
			name
		);

		workspaceRuntime.replaceBuffer(paneID, Modules.PROFILE);
	}
</script>

{#snippet header()}
	<CreateAccountHeader bind:navService></CreateAccountHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<p class="p-2">All you need is a name.</p>
		<div class="flex max-w-72 flex-col space-y-6">
			<input
				bind:value={name}
				type="text"
				id="name"
				placeholder="Name"
				class=" border-primary-500 w-full border-b-1 outline-none"
			/>
			<KJVButtonRounded onClick={createAccount}>Create Account</KJVButtonRounded>
		</div>
	</div>
{/snippet}

<BufferHeader
	bind:headerHeight
	classes="flex w-full justify-between outline outline-neutral-400 text-neutral-700"
>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight}>
	{@render body()}
</BufferBody>
