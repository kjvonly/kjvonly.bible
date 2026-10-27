<script lang="ts">
	import {
		useNavigationEntryContext
	} from '$lib/application/runtime/navigation/navigation-entry-context';
	import {
		useNavigationRuntimeContext
	} from '$lib/application/runtime/navigation/navigation-runtime-context';

	const { navigationState } = useNavigationEntryContext();
	const { navigation } = useNavigationRuntimeContext();
</script>

<!-- A lightweight destination: the real Bible Reader's data dependencies are
     outside this File Manager → Normalized Content reference-routing test. -->
<div data-testid="bible-reference-destination">
	<span>{String(navigationState.state.bibleLocationRef)}</span>
	<button onclick={() => navigation.back()}>Back to document</button>
</div>
