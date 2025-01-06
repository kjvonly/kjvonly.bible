<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	onMount(() => {
        goto(`${base}/bible/chapter`)
	});
</script>

