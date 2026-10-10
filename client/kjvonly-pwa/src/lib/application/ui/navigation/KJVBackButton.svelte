<script lang="ts">
	// COMPONENTS
	import KJVPressHoldButton from '$lib/components/buttons/KJVPressHoldButton.svelte';
	import ArrowBack from '$lib/components/svgs/arrowBack.svelte';

	// NAVIGATION
	import {
		useNavigationRuntimeContext
	} from '../../runtime/navigation/navigation-runtime-context';

	const { navigation } =
		useNavigationRuntimeContext();
</script>

<!--
	@component
	Standard Pane Back control. A normal press pops one navigation entry; a
	press-and-hold invokes Pane escape, which closes a removable Pane or resets
	the final Pane to a fresh `modules.root`.
-->
<KJVPressHoldButton
	label="Back. Press and hold to exit pane."
	onClick={() => navigation.back()}
	onHold={() => navigation.escapePane()}
>
	<ArrowBack classes="h-[1.25em] w-[1.25em]"></ArrowBack>
</KJVPressHoldButton>
