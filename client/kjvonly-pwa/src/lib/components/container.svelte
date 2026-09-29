<script lang="ts">
	let { children } = $props();
</script>

<div class="kjv-app-viewport flex justify-center">
	<div class="h-full min-h-0 w-full overflow-hidden">
		{@render children?.()}
	</div>
</div>
