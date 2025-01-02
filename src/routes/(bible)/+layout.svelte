<script lang="ts">
	import Container from './components/container.svelte';
	import Header from './components/header.svelte';

	let { children } = $props();
</script>

<Container>
	<Header></Header>
	<div class="flex justify-center m-12">
		<div class="md:max-w-lg max-w-sm ">
			<div class="flex flex-wrap justify-start">
				{@render children()}
			</div>
		</div>
	</div>
</Container>
