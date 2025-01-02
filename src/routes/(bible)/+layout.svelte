<script lang="ts">
	import Container from './components/container.svelte';
	import Header from './components/header.svelte';

	let { children } = $props();
</script>

<Container>
	<Header></Header>
	<div class="flex justify-center">
		<div class="max-w-xl ">
			<div class="flex flex-wrap justify-start">
				{@render children()}
			</div>
		</div>
	</div>
</Container>
