<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		useNavigationRuntimeContext,
		useNavigationEntryContext,
		useApplicationContext,
		type NavigationStateValue,
		usePaneLayoutContext
	} from '$lib/application';
	import { KJVBackButton, ViewBody, ViewHeader } from '$lib/application/ui';
	import { KJVHeader } from '$lib/components';
	import {
		NORMALIZED_CONTENT_NAVIGATION_RESULTS,
		NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES
	} from '../../../models/normalized-content-navigation.model';

	import type { NormalizedContentTextMarkup } from '../../../models/normalized-content-text-markup.model';

	const { navigation } = useNavigationRuntimeContext();
	const { navigationState } = useNavigationEntryContext();
	const { authenticationService, normalizedContentTextMarkupService } = useApplicationContext();
	const paneLayout = usePaneLayoutContext();
	let clientHeight = $derived(paneLayout.clientHeight);
	let headerHeight = $state(0);
	let retrying = $state(false);
	let retryFailed = $state(false);
	type LocalTextMarkupState =
		| { readonly status: 'checking' }
		| { readonly status: 'available'; readonly publisher: string; readonly markup: NormalizedContentTextMarkup }
		| { readonly status: 'missing' }
		| { readonly status: 'error' };
	let localTextMarkup = $state<LocalTextMarkupState>({ status: 'checking' });
	let actionsDisabled = $derived(retrying || localTextMarkup.status === 'checking');
	let disposed = false;

	/** Inspect persisted markup without attempting another relay lookup. */
	onMount(() => {
		void checkLocalTextMarkup();
	});

	async function checkLocalTextMarkup(): Promise<void> {
		try {
			const publisher = authenticationService.tryGetUserId();
			if (!publisher) throw new Error('Sign in to retrieve Text Markup.');
			const markup = await normalizedContentTextMarkupService.getLocal(
				publisher,
				navigationState.state.descriptor
			);
			if (disposed) {
				return;
			}
			localTextMarkup = markup
				? { status: 'available', publisher, markup }
				: { status: 'missing' };
		} catch {
			if (!disposed) localTextMarkup = { status: 'error' };
		}
	}
	onDestroy(() => { disposed = true; });

	const optionButtonClass = 'flex min-h-[max(2.75rem,44px)] w-full items-center gap-3 bg-neutral-50 px-4 py-3 text-left text-base text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary-500';

	/** Retry in this view. A successful retrieval returns the accepted markup to the Reader. */
	async function retryTextMarkupLookup(): Promise<void> {
		if (retrying) {
			return;
		}
		retrying = true;
		retryFailed = false;
		try {
			const publisher = authenticationService.tryGetUserId();
			if (!publisher) throw new Error('Sign in to retrieve Text Markup.');
			const markup = await normalizedContentTextMarkupService.get(
				publisher,
				navigationState.state.descriptor
			);
			if (disposed) {
				return;
			}
			await navigation.backWithResult({
				type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
				outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.LOADED,
				publisher,
				markup: markup as unknown as NavigationStateValue
			});
		} catch {
			if (!disposed) retryFailed = true;
		} finally {
			if (!disposed) retrying = false;
		}
	}

	/** Use the accepted local copy; no relay lookup or write occurs here. */
	async function continueWithLocalTextMarkup(): Promise<void> {
		if (retrying || localTextMarkup.status !== 'available') {
			return;
		}
		await navigation.backWithResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.USE_LOCAL,
			publisher: localTextMarkup.publisher,
			markup: localTextMarkup.markup as unknown as NavigationStateValue
		});
	}

	/** Return an explicit decision to create a fresh draft; no write occurs here. */
	async function continueWithNewTextMarkup(): Promise<void> {
		if (actionsDisabled || localTextMarkup.status !== 'missing') {
			return;
		}
		await navigation.backWithResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.START_NEW
		});
	}

	/** Return an explicit decision to use Notes and Bookmarks without Text Markup. */
	async function continueWithoutTextMarkup(): Promise<void> {
		if (retrying) {
			return;
		}
		await navigation.backWithResult({
			type: NORMALIZED_CONTENT_NAVIGATION_RESULTS.TEXT_MARKUP_LOOKUP,
			outcome: NORMALIZED_CONTENT_TEXT_MARKUP_LOOKUP_OUTCOMES.WITHOUT_MARKUP
		});
	}
</script>

{#snippet leadingContent()}
	<KJVBackButton></KJVBackButton>
{/snippet}

<ViewHeader bind:headerHeight>
	<KJVHeader title="Text Markup lookup" {leadingContent}></KJVHeader>
</ViewHeader>

<ViewBody {clientHeight} {headerHeight} classes="remove-default-class">
	<div class="px-4 py-4 text-sm text-neutral-700" role="alert">
		Unable to verify published Text Markup for this document. A relay may be unavailable.
		{#if localTextMarkup.status === 'available'}
			A saved local copy is available. You can continue editing it without downloading anything.
		{:else if localTextMarkup.status === 'missing'}
			Starting new markings could overwrite Text Markup already published for this document.
		{:else if localTextMarkup.status === 'error'}
			Unable to check local storage. Retry the lookup or continue without Text Markup.
		{:else}
			Checking for a saved local copy…
		{/if}
	</div>
	{#if retrying}
		<p class="px-4 py-3 text-sm text-neutral-700" role="status">Retrying Text Markup lookup…</p>
	{:else if retryFailed}
		<p class="px-4 py-3 text-sm text-neutral-700" role="alert">Still unable to retrieve Text Markup. You can retry or choose another option.</p>
	{/if}
	<ul aria-label="Text Markup lookup choices">
		<li>
			<button type="button" disabled={actionsDisabled} onclick={() => void retryTextMarkupLookup()} class={optionButtonClass}>
				Retry lookup
			</button>
		</li>
		{#if localTextMarkup.status === 'available'}
			<li>
				<button type="button" disabled={actionsDisabled} onclick={() => void continueWithLocalTextMarkup()} class={optionButtonClass}>
					Continue with local Text Markup
				</button>
			</li>
		{:else if localTextMarkup.status === 'missing'}
			<li>
				<button type="button" disabled={actionsDisabled} onclick={() => void continueWithNewTextMarkup()} class={optionButtonClass}>
					Continue with new Text Markup
				</button>
			</li>
		{/if}
		<li>
			<button type="button" disabled={retrying} onclick={() => void continueWithoutTextMarkup()} class={optionButtonClass}>
				Continue without Text Markup
			</button>
		</li>
	</ul>
</ViewBody>
