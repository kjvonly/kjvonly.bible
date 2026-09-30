<script lang="ts">
	import '../app.css';
	import '../../../node_modules/quill/dist/quill.snow.css';

	import { onMount } from 'svelte';

	import Container from '$lib/components/container.svelte';
	import {
		createApplicationConfig,
		provideApplicationContext
	} from '$lib/application';
	/*
	 * Application is the concrete composition root. Keep this direct import at
	 * the application bootstrap boundary; runtime consumers should use the
	 * public Application APIs or ApplicationContext instead.
	 */
	import { Application } from '$lib/application/runtime/application';

	const MINIMUM_SPLASH_DURATION_MS = 1_500;

	const application = new Application(createApplicationConfig());

	provideApplicationContext(application.context);

	let ready = $state(false);
	let startupError: unknown = $state();

	async function requestPersistentStorage(): Promise<void> {
		if (!navigator.storage?.persist) {
			return;
		}

		const persisted = await navigator.storage.persisted();
		if (persisted) {
			return;
		}

		await navigator.storage.persist();
	}

	onMount(() => {
		let disposed = false;

		const start = async () => {
			const minimumSplashDuration = new Promise<void>((resolve) => {
				setTimeout(resolve, MINIMUM_SPLASH_DURATION_MS);
			});

			try {
				void requestPersistentStorage();

				await application.context.authenticationService.tryLogin();
				await application.start();
				await minimumSplashDuration;

				if (!disposed) {
					ready = true;
				}
			} catch (error) {
				await minimumSplashDuration;

				if (!disposed) {
					startupError = error;
				}
			}
		};

		void start();

		return () => {
			disposed = true;
			void application.stop();
		};
	});

	let { children } = $props();
</script>

{#snippet splash()}
	<div
		class="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#000205] p-6 sm:p-8"
		role="status"
		aria-live="polite"
	>
		<img
			src="/icons/app-icon.svg"
			alt=""
			class="min-h-0 w-full flex-1 object-contain"
		/>
		<p class="splash-loading text-base text-white">Application Loading...</p>
	</div>
{/snippet}

<style>
	.splash-loading {
		animation: splash-loading-pulse 1.4s ease-in-out infinite;
	}

	@keyframes splash-loading-pulse {
		0%,
		100% {
			opacity: 0.55;
			text-shadow: 0 0 0.15rem rgb(255 255 255 / 20%);
		}

		50% {
			opacity: 1;
			text-shadow:
				0 0 0.45rem rgb(255 255 255 / 85%),
				0 0 0.9rem rgb(255 255 255 / 45%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.splash-loading {
			animation: none;
			opacity: 1;
			text-shadow: 0 0 0.3rem rgb(255 255 255 / 35%);
		}
	}
</style>

<svelte:head>
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

<Container>
	{#if ready}
		{@render children?.()}
	{:else if startupError}
		<div>Application startup failed.</div>
	{:else}
		{@render splash()}
	{/if}
</Container>
