<script lang="ts">
	import { authorProfile } from '$lib/nostr/stores/Author';
	import type { User } from '$lib/nostr/Types';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	let profile: User = $state({});
	onMount(() => {
		profile = get(authorProfile);
	});
</script>

<div>
	<p class="capitalize underline">name</p>
	<div class="grid grid-cols-1">
		<span class="break-words">{profile?.name}</span>
	</div>
</div>
