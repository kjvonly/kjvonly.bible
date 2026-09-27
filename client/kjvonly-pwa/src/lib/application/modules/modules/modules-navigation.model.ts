export const MODULES_VIEWS = {
	ROOT: 'modules.root'
} as const;

export type ModulesView =
	typeof MODULES_VIEWS[
		keyof typeof MODULES_VIEWS
	];
