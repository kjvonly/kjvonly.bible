<script lang="ts">
	import { goto } from '$app/navigation';
	import { bibleDB } from '$lib/db/bible.db';
	import { onMount } from 'svelte';

	onMount(() => {
        goto(`${import.meta.env.BASE_URL}bible/chapter`)
	});
</script>

