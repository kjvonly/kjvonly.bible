<script lang="ts">
	// ================================ IMPORTS ================================
	// COMPONENTS
	import BufferBody from '$lib/components/bufferBody.svelte';
	import BufferContainer from '$lib/components/bufferContainer.svelte';
	import BufferHeader from '$lib/components/bufferHeader.svelte';
	import NsecLogin from './unauthed/nsecLogin.svelte';

	// MODELS
	import { Modules } from '$lib/models/modules.model';

	// SERVICES
	import { authService } from '$lib/services/auth.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { toastService } from '$lib/services/toast.service';
	import { onMount } from 'svelte';
	import LoginHeader from './loginHeader.svelte';
	import LoginOptions from './loginOptions/loginOptions.svelte';
	import { localStorageService } from '$lib/nostr/services/localStorage.service';
	import { identityService } from '$lib/nostr/services/identity.service';

	// =============================== BINDINGS ================================
	let {
		paneID,
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable(),
		onClose = undefined
	} = $props();

	// ================================== VARS =================================
	let clientHeight: number = $state(0);
	const VIEW_STATES = {
		LOGIN_OPTIONS: 0,
		NSEC: 1
	} as const;

	let VIEW_STATE = $state(VIEW_STATES.LOGIN_OPTIONS);

	let nav = $state([{ component: LoginOptions, obj: {} }]);
	// =============================== LIFECYCLE ===============================
	onMount(async () => {
		let authenticated = await hasIdentity();
		if (authenticated) {
		}
	});

	// ================================ FUNCS ==================================
	async function hasIdentity(): Promise<boolean> {
		const storedIdentity = identityService.getIdentity();
		console.debug('[loginContainer storedIdentites]', storedIdentity);

		if (storedIdentity === null) {
			return false;
		}

		return true;
	}

	// ============================== CLICK FUNCS ==============================
	function stopPropagation(e: Event) {
		e.stopPropagation();
	}
</script>

<!-- ============================== CONTAINER ============================== -->
<BufferContainer bind:clientHeight>
	{#each nav as n, index}
		{@const Component = n.component}
		<div
			class="{index === nav.length - 1 ? '' : 'hidden'} h-full w-full"
			onclick={stopPropagation}
		>
			<Component {paneID} bind:clientHeight bind:obj={n.obj} bind:nav
			></Component>
		</div>
	{/each}
</BufferContainer>
