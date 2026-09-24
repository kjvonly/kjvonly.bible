import type {
	SettingsDefinition,
	SettingsPageID
} from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export const SETTINGS_PAGE_IDS = {
	ROOT: 'settings',
	APPEARANCE: 'appearance',
	BIBLE: 'bible'
} as const satisfies Record<string, SettingsPageID>;

///////////////////////////////////////////////////////////////////////////////

export const settingsDefinition: SettingsDefinition = {
	rootPageID: SETTINGS_PAGE_IDS.ROOT,
	pages: [
		{
			id: SETTINGS_PAGE_IDS.ROOT,
			title: 'Settings',
			sections: [
				{
					id: 'general',
					rows: [
						{
							type: 'group',
							id: 'appearance',
							title: 'Appearance',
							secondary: 'Theme, fonts, colors and text size',
							icon: {
								name: 'appearance',
								accent: 'vivid-b-500'
							},
							search: {
								keywords: ['theme', 'font', 'color', 'text']
							},
							pageID: SETTINGS_PAGE_IDS.APPEARANCE
						},
						{
							type: 'group',
							id: 'bible',
							title: 'Bible',
							secondary: 'Bible reader display options',
							icon: {
								name: 'bible',
								accent: 'support-a-500'
							},
							search: {
								keywords: ['bible', 'reader', 'display']
							},
							pageID: SETTINGS_PAGE_IDS.BIBLE
						}
					]
				}
			]
		},
		{
			id: SETTINGS_PAGE_IDS.APPEARANCE,
			title: 'Appearance',
			sections: [
				{
					id: 'theme',
					label: 'Theme',
					rows: [
						{
							type: 'select',
							id: 'theme-mode',
							title: 'Theme',
							icon: {
								name: 'theme-mode'
							},
							search: {
								keywords: ['light', 'dark', 'theme', 'mode']
							},
							setting: 'isDarkTheme',
							options: [
								{ id: 'light', label: 'Light', value: false },
								{ id: 'dark', label: 'Dark', value: true }
							]
						},
						{
							type: 'select',
							id: 'color-theme',
							title: 'Color theme',
							icon: {
								name: 'color-theme'
							},
							search: {
								keywords: ['color', 'theme', 'palette', 'night', 'colorblind']
							},
							setting: 'colorTheme',
							options: [
								{ id: 'night', label: 'Night', value: 'night' },
								{ id: 'night-colorblind', label: 'Night Colorblind', value: 'night-colorblind' },
								{ id: 'red', label: 'Red', value: 'red' },
								{ id: 'light-blue', label: 'Light Blue', value: 'light-blue' },
								{ id: 'purple', label: 'Purple', value: 'purple' },
								{ id: 'cyan', label: 'Cyan', value: 'cyan' },
								{ id: 'pink', label: 'Pink', value: 'pink' }
							]
						}
					]
				},
				{
					id: 'text',
					label: 'Text',
					rows: [
						{
							type: 'custom',
							id: 'font-size',
							title: 'Font size',
							secondary: {
								setting: 'fontSize',
								formatter: 'font-size'
							},
							icon: {
								name: 'font-size'
							},
							search: {
								keywords: ['font', 'size', 'text', 'scale']
							},
							view: 'font-size'
						},
						{
							type: 'select',
							id: 'font-family',
							title: 'Font family',
							icon: {
								name: 'font-family'
							},
							search: {
								keywords: ['font', 'family', 'typeface', 'text']
							},
							setting: 'fontFamily',
							options: [
								{ id: 'sans', label: 'Sans', value: 'sans' },
								{ id: 'serif', label: 'Serif', value: 'serif' },
								{ id: 'mono', label: 'Monospace', value: 'mono' },
								{ id: 'kjv', label: 'KJV 1611', value: 'kjv' },
								{ id: 'roboto-mono', label: 'Roboto Mono', value: 'roboto-mono' },
								{ id: 'jetbrains-mono', label: 'JetBrains Mono', value: 'jetbrains-mono' }
							]
						},
						{
							type: 'select',
							id: 'font-weight',
							title: 'Font weight',
							icon: {
								name: 'font-weight'
							},
							search: {
								keywords: ['font', 'weight', 'bold', 'text']
							},
							setting: 'fontWeight',
							options: [
								{ id: '100', label: '100', value: 100 },
								{ id: '200', label: '200', value: 200 },
								{ id: '300', label: '300', value: 300 },
								{ id: '400', label: '400', value: 400 },
								{ id: '500', label: '500', value: 500 },
								{ id: '600', label: '600', value: 600 },
								{ id: '700', label: '700', value: 700 },
								{ id: '800', label: '800', value: 800 },
								{ id: '900', label: '900', value: 900 }
							]
						}
					]
				},
				{
					id: 'layout',
					label: 'Layout',
					rows: [
						{
							type: 'toggle',
							id: 'enable-max-width',
							title: 'Maximum width',
							secondary: 'Limit content to the configured maximum width',
							icon: {
								name: 'max-width'
							},
							search: {
								keywords: ['width', 'layout', 'content']
							},
							setting: 'enableMaxWidth'
						}
					]
				}
			]
		},
		{
			id: SETTINGS_PAGE_IDS.BIBLE,
			title: 'Bible',
			sections: [
				{
					id: 'display',
					label: 'Display',
					rows: [
						{
							type: 'toggle',
							id: 'show-paragraphs',
							title: 'Paragraphs',
							secondary: 'Display Bible text using paragraph formatting',
							icon: {
								name: 'paragraphs'
							},
							search: {
								keywords: ['paragraph', 'paragraphs', 'formatting']
							},
							setting: 'showParagraphs'
						},
						{
							type: 'toggle',
							id: 'show-pericopes',
							title: 'Pericopes',
							secondary: 'Display pericope headings in the Bible reader',
							icon: {
								name: 'pericopes'
							},
							search: {
								keywords: ['pericope', 'pericopes', 'headings']
							},
							setting: 'showPericopes'
						},
						{
							type: 'toggle',
							id: 'show-bible-version',
							title: 'Bible version',
							secondary: 'Display the Bible version in the reader',
							icon: {
								name: 'bible-version'
							},
							search: {
								keywords: ['bible', 'version', 'translation']
							},
							setting: 'showBibleVersion'
						}					]
				}
			]
		}
	]
};
