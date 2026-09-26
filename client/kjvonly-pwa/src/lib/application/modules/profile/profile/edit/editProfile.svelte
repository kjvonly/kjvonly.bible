<script lang="ts">
	import type { AccountRelay } from '$lib/application/services/account/account-state';
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';
	import BufferBody from '$lib/application/runtime/buffer/components/bufferBody.svelte';
	import BufferHeader from '$lib/application/runtime/buffer/components/bufferHeader.svelte';
	import EditProfileHeader from './editProfileHeader.svelte';
	import Name from './name.svelte';
	import Relays from './relays.svelte';

	let {
		clientHeight
	}: {
		clientHeight: number;
	} = $props();

	const {
		accountService,
		authenticationService,
		toastService
	} = useApplicationContext();

	const {
		navigation
	} = useNavigationRuntimeContext();

	const account = accountService.getState();

	let headerHeight: number = $state(0);
	let saving = $state(false);
	let name = $state(account.name ?? '');
	let relays = $state<readonly AccountRelay[]>(
		(account.relays ?? []).map((relay) => ({ ...relay }))
	);

	function isRelayUrl(value: string): boolean {
		try {
			const url = new URL(value);
			return url.protocol === 'wss:' || url.protocol === 'ws:';
		} catch {
			return false;
		}
	}

	async function onSave(): Promise<void> {
		if (saving) {
			return;
		}

		const authentication = authenticationService.getState();

		if (authentication.status !== 'authenticated') {
			toastService.showToast('Login first');
			return;
		}

		const updatedName = name.trim();
		const updatedRelays = relays.map((relay) => ({
			...relay,
			url: relay.url.trim()
		}));

		if (updatedName === '') {
			toastService.showToast('Profile name is required');
			return;
		}

		const relayUrls = new Set<string>();

		for (const relay of updatedRelays) {
			if (!isRelayUrl(relay.url)) {
				toastService.showToast(`Invalid relay: ${relay.url || '(empty)'}`);
				return;
			}

			if (!relay.read && !relay.write) {
				toastService.showToast(`Relay must be readable or writable: ${relay.url}`);
				return;
			}

			if (relayUrls.has(relay.url)) {
				toastService.showToast(`Duplicate relay: ${relay.url}`);
				return;
			}

			relayUrls.add(relay.url);
		}

		saving = true;

		try {
			await accountService.update(
				authentication.userId,
				updatedName,
				updatedRelays
			);

			toastService.showToast('Saved Profile');
			navigation.back();
		} catch (error) {
			console.warn('[Profile save failed]', error);
			toastService.showToast('Unable to save Profile');
		} finally {
			saving = false;
		}
	}
</script>

{#snippet header()}
	<EditProfileHeader {saving} {onSave}></EditProfileHeader>
{/snippet}

{#snippet body()}
	<div class="flex h-full flex-col items-start justify-start space-y-4 py-4">
		<Name bind:name></Name>
		<Relays bind:relays></Relays>
	</div>
{/snippet}

<BufferHeader bind:headerHeight>
	{@render header()}
</BufferHeader>
<BufferBody {clientHeight} {headerHeight}>
	{@render body()}
</BufferBody>
