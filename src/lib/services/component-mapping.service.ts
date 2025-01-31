import ChapterContainer from '../../routes/(bible)/bible/components/chapterContainer.svelte';

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
	getComponent(componentName: string): Object | null {
		switch (componentName) {
			case 'ChapterContainer':
				return ChapterContainer;
		}

		return null;
	}
}

export let componentMapping = new ComponentMapping();
