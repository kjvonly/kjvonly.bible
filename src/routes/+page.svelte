<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
        goto(`${import.meta.env.VITE_BASE_URL}bible/chapter`)
		let link = document.createElement('link')
		link.setAttribute('rel', 'manifest')
		link.setAttribute('href', `${import.meta.env.VITE_BASE_URL}manifest.json`)
		document.getElementById('kjvonly-head')?.appendChild(link)
	});
</script>

