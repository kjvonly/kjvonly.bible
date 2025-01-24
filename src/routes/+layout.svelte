<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { bibleDB } from '$lib/db/bible.db';
	
	import { searchService } from '$lib/services/search.service';

	onMount(async () => {
		/* This pulls the chapter and strongs data from api and stores in indexdb for offline use. */
		bibleDB.init();
	});

	let { children } = $props();
</script>

{@render children()}
