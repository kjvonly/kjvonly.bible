export const PROFILE_VIEWS = {
	ROOT: 'profile.root',
	EDIT: 'profile.edit'
} as const;

export type ProfileView =
	typeof PROFILE_VIEWS[
		keyof typeof PROFILE_VIEWS
	];
