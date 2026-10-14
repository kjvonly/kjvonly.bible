import type {
	FilesystemEntry,
	FilesystemRoot
} from '$lib/domains/filesystem';

import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	Modules
} from '../../../models/modules.model';

import type {
	NavigationViewState
} from '../../../services/navigation.service';

import {
	createFileManagerOpenSequence
} from './file-manager-open-sequence';

import type {
	ResourceModuleOpenContext
} from '../../modules/resource-module-resolver';

import {
	FILE_MANAGER_VIEWS,
	type FileManagerView,
	type FileManagerViewMode
} from '../models/file-manager-navigation.model';

/** Pane-navigation operations used by the FileManager facade. */
interface FileManagerPaneNavigation {
	pushView(
		view: FileManagerView,
		state: NavigationViewState
	): unknown;

	pushModule(
		module: Modules,
		view: string | number,
		state: NavigationViewState
	): unknown;

	back(): void;
}

/** Application Resource-to-Module boundary consumed by FileManager. */
interface FileManagerResourceModuleResolver {
	resolve(
		descriptor: ResourceDescriptor,
		context?: ResourceModuleOpenContext
	): {
		readonly module: Modules;
		readonly view: string | number;
		readonly state: NavigationViewState;
	};
}

/** Minimal toast surface used for Resource-open feedback. */
interface FileManagerToastService {
	showToast(message: string): void;
}

/**
 * FileManager navigation facade over the Pane's flat navigation stack.
 *
 * Views persist only filesystem identity/location and presentation state. The
 * mounted entry set and projected tree are reconstructed from FilesystemService.
 */
export class FileManagerNavigationService {
	constructor(
		private readonly paneNavigation:
			FileManagerPaneNavigation,

		private readonly resourceModuleResolver:
			FileManagerResourceModuleResolver,

		private readonly toastService:
			FileManagerToastService
	) {}

	/** Opens one mounted filesystem root in the browser view. */
	openRoot(
		root: FilesystemRoot,
		viewMode: FileManagerViewMode = 'list'
	): void {
		this.openDirectory(
			root.publisher,
			root.rootPath,
			root.rootPath,
			viewMode
		);
	}

	/** Opens FileManager's full-page overflow action list. */
	openOverflowActions(): void {
		this.paneNavigation.pushView(
			FILE_MANAGER_VIEWS.OVERFLOW_ACTIONS,
			{}
		);
	}

	/** Opens the global FileManager finder while preserving presentation mode. */
	openSearch(
		viewMode: FileManagerViewMode = 'list'
	): void {
		this.paneNavigation.pushView(
			FILE_MANAGER_VIEWS.SEARCH,
			{
				query: '',
				publisher: '',
				rootPath: '',
				resourcePublisher: '',
				category: '',
				dataType: '',
				mediaType: '',
				fileType: 'all',
				viewMode
			}
		);
	}

	/**
	 * Resolves and pushes the application's preferred Module for one Resource.
	 * Destination state is owned by the registered Module resolver; FileManager
	 * does not load or interpret the Resource before crossing this boundary.
	 * The optional Filesystem path supplies display-only launch context. A
	 * displayed ordered selection allows viewers to provide Previous/Next without
	 * depending on File Manager or determining the ordering themselves.
	 */
	openResource(
		descriptor: ResourceDescriptor,
		filesystemPath?: string,
		selection?: {
			readonly entries: readonly FilesystemEntry[];
			readonly selectedIndex: number;
		}
	): void {
		let destination:
			ReturnType<
				FileManagerResourceModuleResolver['resolve']
			>;

		try {
			const fileName = filesystemPath?.split('/').pop();
			const sequence = selection
				? createFileManagerOpenSequence(
					selection.entries,
					selection.selectedIndex
				)
				: undefined;
			const context: ResourceModuleOpenContext = {
				...(fileName ? { fileName } : {}),
				...(sequence ? { sequence } : {})
			};
			destination = fileName || sequence
				? this.resourceModuleResolver.resolve(descriptor, context)
				: this.resourceModuleResolver.resolve(descriptor);
		} catch (error) {
			console.error(
				'FileManager Resource resolution failed.',
				error
			);

			this.toastService.showToast(
				'No application is available to open this file.'
			);
			return;
		}

		try {
			this.paneNavigation.pushModule(
				destination.module,
				destination.view,
				destination.state
			);
		} catch (error) {
			console.error(
				'FileManager Resource navigation failed.',
				error
			);

			this.toastService.showToast(
				'Unable to open this file.'
			);
		}
	}

	/**
	 * Returns to an already-mounted ancestor browser entry instead of pushing it again.
	 *
	 * FileManager pushes exactly one browser entry for each directory descent, so
	 * the path-depth delta equals the number of Pane Back operations required.
	 */
	backToAncestorDirectory(
		currentPath: string,
		targetPath: string
	): void {
		if (targetPath === currentPath) {
			return;
		}

		if (!currentPath.startsWith(`${targetPath}/`)) {
			throw new Error(
				`FileManager breadcrumb target is not an ancestor: ${targetPath}`
			);
		}

		const steps =
			pathDepth(currentPath) -
			pathDepth(targetPath);

		for (let index = 0; index < steps; index += 1) {
			this.paneNavigation.back();
		}
	}

	/** Pushes one filesystem directory while preserving its root identity. */
	openDirectory(
		filesystemPublisher: string,
		rootPath: string,
		path: string,
		viewMode: FileManagerViewMode = 'list'
	): void {
		this.paneNavigation.pushView(
			FILE_MANAGER_VIEWS.BROWSER,
			{
				publisher: filesystemPublisher,
				rootPath,
				path,
				viewMode
			}
		);
	}
}

function pathDepth(path: string): number {
	return path
		.split('/')
		.filter((segment) => segment.length > 0)
		.length;
}
