<script lang="ts">
	// COMPONENTS
	import KJVPressHoldButton from '$lib/components/buttons/KJVPressHoldButton.svelte';
	import MoreVertical from '$lib/components/svgs/moreVertical.svelte';

	// MODELS
	import {
		Modules
	} from '../../models/modules.model';
	import {
		MODULES_VIEWS
	} from '../../modules/modules/modules-navigation.model';

	// NAVIGATION
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';

	interface Props {
		/** Opens the current view's ordinary More Actions surface. */
		onClick: () => void;
		disabled?: boolean;
	}

	let {
		onClick,
		disabled = false
	}: Props = $props();

	const { navigation } =
		useNavigationRuntimeContext();

	/** Pushes the Modules launcher while preserving the current stack underneath. */
	function openModules(): void {
		navigation.pushModule(
			Modules.MODULES,
			MODULES_VIEWS.ROOT,
			{}
		);
	}
</script>

<!--
	@component
	Standard More Actions header control. A normal press delegates to the
	current view's overflow/action behavior; a press-and-hold pushes the Modules
	launcher onto the same Pane navigation stack so Back returns to the caller.
-->
<KJVPressHoldButton
	label="More actions. Press and hold to open modules."
	{onClick}
	onHold={openModules}
	{disabled}
>
	<MoreVertical classes="h-[1.25em] w-[1.25em]"></MoreVertical>
</KJVPressHoldButton>
