<script lang="ts">
	import KJVButtonRounded from '$lib/components/buttons/KJVButtonRounded.svelte';
	import { onMount } from 'svelte';
	import NsecLogin from '../nsec/nsecLogin.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import BufferBody from '$lib/components/bufferBody.svelte';
	import LoginOptionsHeader from './loginOptionsHeader.svelte';

	let {
		paneID,
		clientHeight = $bindable(),
		obj = $bindable(),
		navService = $bindable()
	} = $props();

	let headerHeight: number = $state(0);

	onMount(() => {
		obj.onNavBack = onNavBack;
	});

	function onNavBack() {
		console.log(obj.bag);
	}
	function createAccount() {}
	function nsecLogin() {
		navService.push({ component: NsecLogin, obj: {} });
	}
</script>

{#snippet header()}
	<LoginOptionsHeader {paneID} bind:clientHeight={headerHeight}
	></LoginOptionsHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-center justify-center">
		<p class="p-2">All you need is a name.</p>
		<div class="flex max-w-72 flex-col space-y-2">
			<KJVButtonRounded onClick={createAccount}>Create Account</KJVButtonRounded
			>

			<KJVButtonRounded onClick={nsecLogin}>NSEC Login</KJVButtonRounded>
		</div>
		<div>
			<span class="flex underline"></span>
			<span class="flex underline"></span>
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
