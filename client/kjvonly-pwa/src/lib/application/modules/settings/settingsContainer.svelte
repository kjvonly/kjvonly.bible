<script lang="ts">
	import { useApplicationContext } from '$lib/application/runtime/application-context';
	import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

	import Settings from './settings.svelte';
	const { workspaceRuntime } = useApplicationContext();

	let { pane = $bindable<Pane>() } = $props();
	function onClose() {
		workspaceRuntime.closePane(pane.id);
	}
</script>

<Settings {onClose}></Settings>
