<script lang="ts">
	import Container from './components/container.svelte';

	let { children } = $props();

	
</script>

<Container>
	{@render children?.()}
</Container>
