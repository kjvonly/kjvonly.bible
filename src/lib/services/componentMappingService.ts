import ChapterContainer from '$lib/modules/chapter/chapterContainer.svelte';
import Modules from '$lib/modules/modules/modules.svelte';
import StrongsVersesRefs from '$lib/modules/refs/strongs-verses-refs/strongsVersesRefs.svelte';
import Search from '../modules/search/search.svelte';

/**
 * Component Mapping is responsible for converting the
 * string value of the component class.
 *
 */
export class ComponentMapping {


	/**
	 *
	 * @param componentName string of class to be returned
	 * @returns component class
	 */
	getComponent(componentName: string): any {
		switch (componentName) {
			case 'ChapterContainer':
				return ChapterContainer;
			case 'StrongsVersesRefs':
				return StrongsVersesRefs;
			case 'Search':
				return Search;
			case 'Modules':
				return Modules
		}

		return ChapterContainer;
	}
	

}

export let componentMapping = new ComponentMapping();
