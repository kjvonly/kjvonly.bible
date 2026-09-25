import type {
	ApplicationContext,
	NavigationState
} from '$lib/application';
import { BIBLE_BOOKNAMES_RESOURCE_TYPE } from '$lib/domains/bible';

type PlansRuntimeContext =
	Pick<
		ApplicationContext,
		| 'bibleBooknamesService'
		| 'moduleResourceSelectionResolver'
		| 'planProgressService'
		| 'planSubscriptionsService'
		| 'plansPubSubService'
	>;

let initialization:
	Promise<void> |
	undefined;

/**
 * Initializes the shared Plans worker projection before a navigated Plans view
 * consumes it. The operation is idempotent so restored views may safely call it
 * independently when the full navigation stack mounts after reload.
 */
export function initializePlansRuntime(
	navigationState: NavigationState,
	context: PlansRuntimeContext
): Promise<void> {
	if (!initialization) {
		initialization =
			initialize(
				navigationState,
				context
			);
	}

	return initialization;
}

async function initialize(
	navigationState: NavigationState,
	context: PlansRuntimeContext
): Promise<void> {
	const booknamesSource =
		context
			.moduleResourceSelectionResolver
			.requireWithNavigationState(
				navigationState,
				BIBLE_BOOKNAMES_RESOURCE_TYPE
			);

	const [
		booknames,
		subscriptions,
		progress
	] = await Promise.all([
		context.bibleBooknamesService.get(
			booknamesSource
		),
		context.planSubscriptionsService.list(),
		context.planProgressService.list()
	]);

	await context.plansPubSubService.initialize(
		booknames.booknamesById,
		subscriptions,
		progress
	);
}
