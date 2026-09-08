<script lang="ts">
	let { children } = $props();
</script>

<div class="flex h-[100vh] w-full justify-center">
	<div class="w-full">
		{@render children?.()}
	</div>
</div>
