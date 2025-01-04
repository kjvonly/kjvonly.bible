<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { onMount } from 'svelte';

	let { showSettingsPopup = $bindable() } = $props();

	onMount(async () => {});

	function chapterSelected(ch: any) {
		showSettingsPopup = false;
	}
</script>

<!--
  Heads up! 👋

  Plugins:
    - @tailwindcss/forms
-->

<div class="h-full w-full justify-start justify-items-start overflow-y-scroll">
	<header class="items c sticky top-0 w-full flex-col border-b-2 border-white bg-gray-10">
		<div class="flex w-full justify-between p-2 text-gray-500">
			<div class="flex items-center">
				<h1 class=" text-center text-lg">READING SETTINGS</h1>
			</div>
		</div>
	</header>
</div>
