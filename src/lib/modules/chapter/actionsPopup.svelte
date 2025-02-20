<script lang="ts">
	import { chapterService } from '$lib/api/chapters.service';
	import { paneService } from '$lib/services/pane.service.svelte';
	import { toastService } from '$lib/services/toast.service';

	let { showActionsDropdown = $bindable(), showCopyVersePopup = $bindable(), paneId } = $props();

	let actions: any = {
		'copy verses': () => {
			showActionsDropdown = false;
			showCopyVersePopup = true;
		},
		search: () => {
			let p = paneService.findNode(paneService.rootPane, paneId);
			p?.updateBuffer('Search');
		},
		notes: () => {
			let p = paneService.findNode(paneService.rootPane, paneId);
			p?.updateBuffer('Notes');
		},
		'split vertical': () => {
			onSplitVertical();
		},
		'split horizontal': () => {
			onSplitHorizontal();
		},
		'export data': () => {
			onExport();
		},
		'import data': () => {
			onImport();
		},
		close: () => {
			onClosePane();
		}
	};

	let actionsOrder = [];

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
		toastService.showToast('starting export data');
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
		toastService.showToast('finished export data');
	}

	function doImport(e) {
		const reader = new FileReader();
		reader.onload = (e2) => {
			let result: any = e2?.target?.result;
			try {
				toastService.showToast('starting import data');
				let data = JSON.parse(result);
				chapterService.putAllAnnotations(data.annotations);
				document.getElementById('kjvonly-import')?.remove();
				toastService.showToast('finished import data');
			} catch (ex) {
				console.log(`error importing file ${e.target.files[0]}`);
				document.getElementById('kjvonly-import')?.remove();
			}
		};
		reader.readAsText(e.target.files[0]);
	}

	async function onImport() {
		var element = document.createElement('input');
		element.setAttribute('id', 'kjvonly-import');
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
					aria-label="close"
					onclick={() => {
						showActionsDropdown = false;
					}}
					class="h-12 w-12 px-2 pt-2 text-neutral-700"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
						<path
							class="fill-neutral-700"
							d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M17,15.59L15.59,17L12,13.41L8.41,17L7,15.59 L10.59,12L7,8.41L8.41,7L12,10.59L15.59,7L17,8.41L13.41,12L17,15.59z"
						/>
					</svg>
				</button>
			</div>
		</header>

		<div
			style="height: {containerHeight - headerHeight}px"
			class="flex w-full flex-col overflow-y-scroll border"
		>
			{#each Object.keys(actions) as a}
				<div class="w-full">
					<button
						onclick={(event) => actions[a]()}
						class="w-full bg-neutral-50 p-4 text-start capitalize hover:bg-primary-50">{a}</button
					>
				</div>
			{/each}
		</div>
	</div>
</div>
