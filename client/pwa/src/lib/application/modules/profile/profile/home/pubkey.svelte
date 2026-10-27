<script lang="ts">
	import { nip19 } from 'nostr-tools';
	import { onMount } from 'svelte';
	import { useApplicationContext } from '$lib/application/runtime/application-context';

	const {
		authenticationService
	} = useApplicationContext();

	let pk = $state('');

	onMount(() => {
		return authenticationService.subscribe(
			(state) => {
				pk =
					state.status === 'signed-out'
						? ''
						: nip19.npubEncode(state.userId);
			}
		);
	});
</script>

<div>
	<p class="capitalize underline">Pubkey</p>
	<div class="grid grid-cols-1">
		<span class="break-words">{pk}</span>
	</div>
</div>
