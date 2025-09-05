<script lang="ts">
	import type { Pane } from '$lib/models/pane.model';
	import { paneService } from '$lib/services/pane.service.svelte';
	import uuid4 from 'uuid4';

	import { onMount, untrack } from 'svelte';
	import Plans from './plans.svelte';

	let id = uuid4();
	let {
		paneId = $bindable<string>(),
		pane = $bindable(),
		containerHeight = $bindable(),
		containerWidth = $bindable()
	} = $props();
</script>

<div class="kjvonly-noselect overflow-hidden">
	<div {id} style="{containerHeight} {containerWidth}">
		<Plans containerHeight paneId></Plans>
	</div>
</div>
