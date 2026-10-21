import { mount, tick, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { type PaneNavigation } from '$lib/application';
import { SettingsService } from '$lib/application/services/settings.service';
import BibleMoreActionsThemeHost from './fixtures/bible-more-actions-theme-host.svelte';

function themeButton(root: ParentNode, label: string): HTMLButtonElement {
	const button = Array.from(root.querySelectorAll('header button')).find(
		(element) => element.textContent?.trim() === label
	);
	if (!button) {
		throw new Error(`Missing Bible More actions header button: ${label}`);
	}
	return button;
}

describe('Bible More actions theme toggle', () => {
	it('persists and applies the alternate mode without popping the menu', async () => {
		localStorage.removeItem('settings');

		const applicationHtml = document.createElement('div');
		applicationHtml.id = 'kjvonly-html';
		document.body.appendChild(applicationHtml);

		const target = document.createElement('div');
		document.body.appendChild(target);
		const settingsService = new SettingsService();
		const backWithResult = vi.fn();
		const navigation = {
			back: vi.fn(),
			escapePane: vi.fn(),
			backWithResult
		} as unknown as PaneNavigation;
		const component = mount(BibleMoreActionsThemeHost, {
			target,
			props: { settingsService, navigation }
		});

		try {
			await tick();
			const headerButtons = Array.from(
				target.querySelectorAll('header button')
			);
			expect(headerButtons).toHaveLength(4);
			expect(headerButtons.map((button) => button.textContent?.trim())).toEqual([
				'',
				'Night mode',
				'Split pane horizontally',
				'Split pane vertically'
			]);
			expect(Array.from(target.querySelectorAll('button')).filter(
				(button) => button.textContent?.trim() === 'Night mode'
			)).toHaveLength(1);

			const nightMode = themeButton(target, 'Night mode');
			expect(nightMode.closest('header')).not.toBeNull();
			expect(Array.from(target.querySelectorAll('button')).filter(
				(button) => button.textContent?.trim() === 'Copy verses'
			)).toHaveLength(1);
			expect(nightMode.querySelector('svg path')?.getAttribute('d'))
				.toMatch(/^M380-160/);
			nightMode.click();
			await tick();

			expect(settingsService.getSettings().isDarkTheme).toBe(true);
			expect(applicationHtml.getAttribute('data-theme'))
				.toBe('color-theme-dark-app');
			const lightMode = themeButton(target, 'Light mode');
			expect(lightMode.querySelector('svg path')?.getAttribute('d'))
				.toMatch(/^M565-395/);
			expect(backWithResult).not.toHaveBeenCalled();

			lightMode.click();
			await tick();
			expect(settingsService.getSettings().isDarkTheme).toBe(false);
			expect(applicationHtml.getAttribute('data-theme'))
				.toBe('color-theme-app');
			expect(themeButton(target, 'Night mode').querySelector('svg path')
				?.getAttribute('d')).toMatch(/^M380-160/);

			// Other settings consumers can change the mode while this view is mounted.
			settingsService.updateSetting('isDarkTheme', true);
			await tick();
			expect(themeButton(target, 'Light mode').querySelector('svg path')
				?.getAttribute('d')).toMatch(/^M565-395/);
		} finally {
			await unmount(component);
			target.remove();
			applicationHtml.remove();
			localStorage.removeItem('settings');
		}
	});
});
