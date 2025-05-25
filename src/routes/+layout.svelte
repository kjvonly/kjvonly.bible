<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { bibleDB } from '$lib/db/bible.db';
	import Container from '$lib/components/container.svelte';
	import '../../node_modules/quill/dist/quill.snow.css'

	onMount(async () => {
		/* This pulls the chapter and strongs data from api and stores in indexdb for offline use. */
		bibleDB.init();
	});

	let { children } = $props();
</script>
<Container>
	{@render children?.()}
</Container>
