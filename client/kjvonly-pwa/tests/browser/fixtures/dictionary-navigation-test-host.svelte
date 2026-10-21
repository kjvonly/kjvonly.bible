<script lang="ts">
	import type { ApplicationContext } from '$lib/application/runtime/application-context';
	import { provideApplicationContext } from '$lib/application/runtime/application-context';
	import { provideNavigationRuntimeContext } from '$lib/application/runtime/navigation/navigation-runtime-context';
	import { providePaneLayoutContext } from '$lib/application/runtime/pane/pane-layout-context';
	import PaneNavigationContainer from '$lib/application/runtime/navigation/components/paneNavigationContainer.svelte';
	import { createModuleResourceSelectionResolver } from '$lib/application/resources/module-resource-selection-resolver';
	import { DICTIONARY_RESOURCE_TYPE } from '$lib/domains/dictionary';
	import { SettingsService } from '$lib/application/services/settings.service';
	import { PetNameService } from '$lib/application/services/pet-name.service';
	import type { PaneNavigationService } from '$lib/application/services/pane-navigation.service';
	import { createDictionaryService, type DictionaryService, type DictionaryEditionSource, type DictionaryEditionManifest } from '$lib/domains/dictionary';
	import { DictionaryRuntime } from '$lib/domains/dictionary/ui';

	let {
		navigation,
		sources,
		dictionaryService,
		petNameService
	}: {
		navigation: PaneNavigationService;
		sources: readonly DictionaryEditionSource[];
		dictionaryService?: DictionaryService;
		petNameService?: PetNameService;
	} = $props();

	/** Report completed chunked editions without downloading Resources in this navigation test. */
	async function prepareSource(source: DictionaryEditionSource) {
		const edition: DictionaryEditionManifest = {
			id: `${source.publisher}/${source.resourceId}`,
			edition: source.resourceId.split('/').at(-1)!,
			publisher: source.publisher,
			resourceId: source.resourceId,
			modifiedAt: 1,
			entryCount: 80,
			storageFormat: 'chunks-v1',
			chunkGeneration: 'test-generation',
			chunkCount: 1
		};
		return { source, status: 'ready' as const, edition };
	}

	const moduleResourceSelectionResolver = createModuleResourceSelectionResolver({
		independent: () => ({ [DICTIONARY_RESOURCE_TYPE]: sources[0]! }),
		related: (_, selections) => ({ [DICTIONARY_RESOURCE_TYPE]: selections[DICTIONARY_RESOURCE_TYPE] ?? sources[0]! })
	});
	provideApplicationContext({
		settingsService: new SettingsService(),
		petNameService: petNameService ?? new PetNameService({ getItem: () => null, setItem: () => undefined }),
		moduleResourceSelectionResolver,
		dictionaryService: dictionaryService ?? createDictionaryService(new DictionaryRuntime(), { prepareSource, listInstalledEditions: async () => sources.map(source => ({...source, id: `${source.publisher}/${source.resourceId}`, edition: source.resourceId.split('/').at(-1)!, modifiedAt: 1, entryCount: 80, storageFormat: 'chunks-v1' as const, chunkGeneration: 'm1', chunkCount: 1})) })
	} as unknown as ApplicationContext);
	provideNavigationRuntimeContext({ navigation });
	providePaneLayoutContext({ clientHeight: 540, clientWidth: 600 });
</script>

<div style="height: 540px; width: 600px;">
	<PaneNavigationContainer {navigation}></PaneNavigationContainer>
</div>
