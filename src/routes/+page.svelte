<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto(`/bible/chapter`);
		let link = document.createElement('link');
		link.setAttribute('rel', 'manifest');
		link.setAttribute('href', `/manifest.json`);
		document.getElementById('kjvonly-head')?.appendChild(link);
	});
</script>
