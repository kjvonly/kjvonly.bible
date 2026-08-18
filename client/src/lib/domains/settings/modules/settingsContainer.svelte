<script lang="ts">
	import type { Pane } from '$lib/models/pane.model';

	import { paneService } from '$lib/services/pane.service.svelte';
	import Settings from './settings.svelte';

	let { pane = $bindable<Pane>() } = $props();
	function onClose() {
		paneService.onDeletePane(paneService.rootPane, pane.id);
	}
</script>

<Settings {onClose}></Settings>
