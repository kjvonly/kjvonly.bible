<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { json } from '@sveltejs/kit';

	let { showActionsDropdown = $bindable(), paneId } = $props();

	let actions: any = {
		'split vertical': () => {
			onSplitVertical();
		},
		'split horizontal': () => {
			onSplitHorizontal();
		},
		'export annotations': () => {
			onExport();
		},
		'import annotations': () => {
			onImport();
		},
		'': () => {},
		close: () => {
			onClosePane();
		}
	};

	function onSplitVertical(): void {
		paneService.onSplitPane(paneId, 'v', 'Modules', {});
		showActionsDropdown = false;
	}

	function onSplitHorizontal() {
		paneService.onSplitPane(paneId, 'h', 'Modules', {});
		showActionsDropdown = false;
	}

	function onClosePane() {
		paneService.onDeletePane(paneService.rootPane, paneId);
	}

	async function onExport() {
		let data = await chapterService.getAllAnnotations();
		var element = document.createElement('a');
		element.setAttribute(
			'href',
			'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data))
		);
		element.setAttribute('download', 'annotations');

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	}

	function doImport(e) {
		const reader = new FileReader();
		reader.onload = (e2) => {
			let result: any = e2?.target?.result;
			try{
				let annotations = JSON.parse(result)
				chapterService.putAllAnnotations(annotations)
				document.getElementById('kjvonly-import')?.remove()
			}catch(ex){
				console.log(`error importing file ${e.target.files[0]}`)
				document.getElementById('kjvonly-import')?.remove()
			}
		};
		reader.readAsText(e.target.files[0]);
	}

	async function onImport() {
		var element = document.createElement('input');
		element.setAttribute('id', 'kjvonly-import')
		element.setAttribute('type', 'file');
		element.setAttribute('accept', '.json');
		element.onchange = doImport;

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		
	}

	let containerHeight = $state(0);
	let headerHeight = $state(0);
</script>

<div bind:clientHeight={containerHeight} class="flex h-full w-full justify-center bg-neutral-50">
	<div class="w-full justify-center md:max-w-lg">
		<header
			bind:clientHeight={headerHeight}
			class="sticky top-0 w-full flex-col border-b-2 bg-neutral-100 text-neutral-700"
		>
			<div class="flex w-full justify-end p-2">
				<button
					onclick={() => {
						showActionsDropdown = false;
					}}
					class=" m-0 p-0"
				>
					Cancel
				</button>
			</div>
		</header>

		<div
			style="height: {containerHeight - headerHeight}px"
			class="flex w-full flex-col overflow-y-scroll border"
		>
			{#each Object.keys(actions) as a}
				{#if a.length > 0}
					<div class="w-full">
						<button
							onclick={(event) => actions[a]()}
							class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-primary-50">{a}</button
						>
					</div>
				{:else}
					<div class="h-8"></div>
				{/if}
			{/each}
		</div>
	</div>
</div>
