<script lang="ts">
	import { authorService } from '$lib/nostr/services/author.service';
	import { nip19 } from 'nostr-tools';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { pubkey } from '$lib/nostr/stores/Author';

	let pk = $state('');
	onMount(() => {
		let p = get(pubkey);
		pk = nip19.npubEncode(p);
	});
</script>

<div>
	<p class="capitalize underline">Pubkey</p>
	<div class="grid grid-cols-1">
		<span class="break-words">{pk}</span>
	</div>
</div>
