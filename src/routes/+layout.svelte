<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { BibleDB } from '$lib/db/bible.db';
	
	import { searchWorker } from '$lib/services/search.service';

	onMount(async () => {
		let bibleDB = new BibleDB()
		/* This pulls the chapter and strongs data from api and stores in indexdb for offline use. */
		bibleDB.init();


		
	});

	let { children } = $props();
</script>

{@render children()}
