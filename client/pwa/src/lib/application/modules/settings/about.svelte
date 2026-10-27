<script lang="ts">
	import { onMount } from 'svelte';

	// APPLICATION
	import { applicationMetadata } from '../../config/application-metadata';

	// COMPONENTS
	import KJVIconButton from '$lib/components/buttons/KJVIconButton.svelte';
	import Copy from '$lib/components/svgs/copy.svelte';

	// ================================= VARS ==================================

	let launchMode = $state('Browser');

	// ================================ FUNCS ==================================

	function copySourceCodeUrl(): void {
		navigator.clipboard.writeText(applicationMetadata.sourceCodeUrl);
	}

	function formatReleaseDate(value: string): string {
		if (!value) {
			return 'Development build';
		}

		const date = new Date(`${value}T00:00:00Z`);

		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	// =============================== LIFECYCLE ===============================

	onMount(() => {
		launchMode = window.matchMedia('(display-mode: standalone)').matches
			? 'Installed app'
			: 'Browser';
	});
</script>

<div class="flex w-full flex-col gap-6 py-4">
	<section class="flex flex-col items-center gap-4 text-center">
		<img
			src="/icons/app-icon.svg"
			alt=""
			aria-hidden="true"
			class="h-32 w-32 object-contain"
		/>

		<div class="flex flex-col gap-1">
			<h2 class="text-lg text-neutral-700">{applicationMetadata.name}</h2>
			<p class="text-sm text-neutral-500">
				Offline-first Bible reading and study application.
			</p>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h3 class="text-base text-primary-500">Application</h3>

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Version</span>
			<span class="text-sm text-neutral-500">{applicationMetadata.version}</span>
		</div>

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Release date</span>
			<span class="text-sm text-neutral-500">
				{formatReleaseDate(applicationMetadata.releaseDate)}
			</span>
		</div>

		{#if applicationMetadata.gitTag}
			<div class="flex items-center justify-between gap-4 py-2">
				<span class="text-base text-neutral-700">Git tag</span>
				<span class="text-sm text-neutral-500">{applicationMetadata.gitTag}</span>
			</div>
		{/if}

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Git commit</span>
			<span class="text-sm text-neutral-500">
				{applicationMetadata.gitCommit === 'development'
					? 'Development build'
					: applicationMetadata.gitCommit.slice(0, 12)}
			</span>
		</div>

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Application type</span>
			<span class="text-sm text-neutral-500">Progressive Web App</span>
		</div>

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Running as</span>
			<span class="text-sm text-neutral-500">{launchMode}</span>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h3 class="text-base text-primary-500">Project</h3>

		<div class="flex items-start justify-between gap-4 py-2">
			<span class="shrink-0 text-base text-neutral-700">Source code</span>
			<div class="flex min-w-0 items-center justify-end gap-1">
				<a
				href={applicationMetadata.sourceCodeUrl}
				target="_blank"
				rel="noreferrer"
				class="select-all break-all text-right text-sm text-primary-500 underline"
				>
					github.com/kjvonly/kjvonly.bible
				</a>
				<KJVIconButton
					label="Copy source code URL"
					variant="quiet"
					onClick={copySourceCodeUrl}
				>
					<Copy />
				</KJVIconButton>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h3 class="text-base text-primary-500">Legal</h3>

		<div class="flex items-start justify-between gap-4 py-2">
			<span class="shrink-0 text-base text-neutral-700">License</span>
			<span class="max-w-2/3 text-right text-sm text-neutral-500">
				{applicationMetadata.license}
			</span>
		</div>

		<div class="flex items-center justify-between gap-4 py-2">
			<span class="text-base text-neutral-700">Licensor</span>
			<span class="text-sm text-neutral-500">{applicationMetadata.licensor}</span>
		</div>
	</section>
</div>
