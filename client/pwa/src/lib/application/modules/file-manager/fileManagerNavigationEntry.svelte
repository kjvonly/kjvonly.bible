<script lang="ts">
	import type {
		Component
	} from 'svelte';

	import {
		useNavigationEntryContext
	} from '../../runtime/navigation/navigation-entry-context';
	import {
		useApplicationContext
	} from '../../runtime/application-context';
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';

	import FileManagerBrowser from './fileManagerBrowser.svelte';
	import FileManagerRoot from './fileManagerRoot.svelte';
	import FileManagerSearch from './fileManagerSearch.svelte';
	import FileManagerOverflowActionsView from './views/fileManagerOverflowActionsView.svelte';
	import {
		FILE_MANAGER_VIEWS,
		type FileManagerView
	} from './models/file-manager-navigation.model';
	import {
		provideFileManagerNavigationContext
	} from './runtime/file-manager-navigation-context';
	import {
		FileManagerNavigationService
	} from './services/file-manager-navigation.service';

	const {
		navigation
	} = useNavigationRuntimeContext();

	const {
		resourceModuleResolver,
		toastService
	} = useApplicationContext();

	const {
		navigationState
	} = useNavigationEntryContext();

	provideFileManagerNavigationContext(
		new FileManagerNavigationService(
			navigation,
			resourceModuleResolver,
			toastService
		)
	);

	const ActiveViewComponent =
		resolveViewComponent(
			navigationState.view
		);

	/** Maps persisted semantic FileManager view IDs to their mounted Svelte view. */
	function resolveViewComponent(
		view: string | number
	): Component {
		switch (view as FileManagerView) {
			case FILE_MANAGER_VIEWS.ROOT:
				return FileManagerRoot;
			case FILE_MANAGER_VIEWS.BROWSER:
				return FileManagerBrowser;
			case FILE_MANAGER_VIEWS.SEARCH:
				return FileManagerSearch;
			case FILE_MANAGER_VIEWS.OVERFLOW_ACTIONS:
				return FileManagerOverflowActionsView;
			default:
				throw new Error(
					`Unsupported FileManager navigation view: ${String(view)}`
				);
		}
	}
</script>

<ActiveViewComponent></ActiveViewComponent>
