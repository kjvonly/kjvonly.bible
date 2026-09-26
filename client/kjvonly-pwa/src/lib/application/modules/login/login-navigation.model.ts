export const LOGIN_VIEWS = {
	ROOT: 'login.root',
	CREATE_ACCOUNT: 'login.create-account',
	NSEC: 'login.nsec'
} as const;

export type LoginView =
	typeof LOGIN_VIEWS[
		keyof typeof LOGIN_VIEWS
	];

