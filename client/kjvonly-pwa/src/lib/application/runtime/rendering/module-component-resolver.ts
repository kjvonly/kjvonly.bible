import { Modules } from '$lib/application/models/modules.model';

import {
	BibleContainer,
	RefsContainer,
	SearchContainer
} from '$lib/domains/bible/ui';
import LoginContainer from '$lib/application/modules/login/loginContainer.svelte';
import ModulesContainer from '$lib/application/modules/modules/modules.svelte';
import { NotesContainer } from '$lib/domains/notes/ui';
import { PlansContainer } from '$lib/domains/reading-plans/ui';
import SettingsContainer from '$lib/application/modules/settings/settingsContainer.svelte';
import ProfileContainer from '$lib/application/modules/profile/profileContainer.svelte';

/**
 * Resolve a renderable application Module to its Svelte component.
 *
 * NULL is the Buffer sentinel for "no module" and is intentionally
 * non-renderable, so it resolves to undefined.
 *
 * Unknown numeric values indicate corrupt/stale runtime state and must fail
 * explicitly rather than silently rendering an unrelated module.
 */
export function resolveModuleComponent(
	module: Modules
) {
	switch (module) {
		case Modules.BIBLE:
			return BibleContainer;
		case Modules.STRONGS:
			return RefsContainer;
		case Modules.SEARCH:
			return SearchContainer;
		case Modules.MODULES:
			return ModulesContainer;
		case Modules.NOTES:
			return NotesContainer;
		case Modules.LOGIN:
			return LoginContainer;
		case Modules.SETTINGS:
			return SettingsContainer;
		case Modules.PLANS:
			return PlansContainer;
		case Modules.PROFILE:
			return ProfileContainer;
		case Modules.NULL:
			return undefined;
		default:
			throw new Error(
				`Unsupported module: ${module}`
			);
	}
}
