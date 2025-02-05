<script lang="ts">
	import Container from '$lib/components/container.svelte';


	let { children } = $props();

	
</script>

<Container>
	{@render children?.()}
</Container>
