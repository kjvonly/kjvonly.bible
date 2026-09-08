export interface ResourceValidator<
	TCandidate,
	TValidated
> {
	validate(
		candidate:
			TCandidate
	): TValidated;
}