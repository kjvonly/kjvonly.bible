import { Modules as modules } from '$lib/models/modules.model';
import BibleContainer from '$lib/domains/bible/bibleContainer.svelte';
import LoginContainer from '$lib/nostr/modules/login/loginContainer.svelte';
import Modules from '$lib/modules/modules/modules.svelte';
import NotesContainer from '$lib/modules/notes/notesContainer.svelte';
import PlansContainer from '$lib/modules/plans/plansContainer.svelte';
import RefsContainer from '$lib/modules/refs/refsContainer.svelte';
import SettingsContainer from '$lib/modules/settings/settingsContainer.svelte';
import Search from '../modules/search/search.svelte';
import ProfileContainer from '$lib/nostr/modules/profile/profileContainer.svelte';

/**
 * Component Mapping is responsible for converting the
 * string value of the component class.
 *
 */
export class ComponentMapping {
  /**
   *
   * @param module string of class to be returned
   * @returns component class
   */
  getComponent(module: modules): any {
    switch (module) {
      case modules.BIBLE:
        return BibleContainer;
      case modules.STRONGS:
        return RefsContainer;
      case modules.SEARCH:
        return Search;
      case modules.MODULES:
        return Modules;
      case modules.NOTES:
        return NotesContainer;
      case modules.LOGIN:
        return LoginContainer;
      case modules.SETTINGS:
        return SettingsContainer;
      case modules.PLANS:
        return PlansContainer;
      case modules.PROFILE:
        return ProfileContainer;
    }

    return BibleContainer;
  }
}

export let componentMapping = new ComponentMapping();
