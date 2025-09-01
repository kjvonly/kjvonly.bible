export class ToastService {
	private static _instance: ToastService;

	private constructor() {}

	public static get Instance() {
		// Do you need arguments? Make it a regular static method instead.
		return this._instance || (this._instance = new this());
	}

	public showToast: Function = () => {};
}

export let toastService = ToastService.Instance;
