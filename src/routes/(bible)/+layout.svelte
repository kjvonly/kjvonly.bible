<script lang="ts">
	import Container from './components/container.svelte';
	import Header from './components/header.svelte';

	let { children } = $props();
</script>

<Container>
{@render children?.()}
</Container>
