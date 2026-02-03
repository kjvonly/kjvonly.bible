<script lang="ts">
	import { authorService } from '$lib/nostr/services/author.service';
	import { nip19 } from 'nostr-tools';
	import { onMount } from 'svelte';

	let pubkey = $state('');
	onMount(() => {
		pubkey = nip19.npubEncode(authorService.pubkey);
	});
</script>

<div>
	<p class="capitalize underline">Pubkey</p>
	<!-- <div class="break-words italic" -->
	<!-- 	{pubkey} -->
	<!-- </div> -->
	<div class="grid grid-cols-1">
		<span class="break-words">{pubkey}</span>
	</div>
</div>
