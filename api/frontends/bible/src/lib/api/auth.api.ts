
import { API_URL } from '$lib/utils/paths';
export class AuthApi {

    login(email: string, password: string): Promise<any> {

		const headers = new Headers();
		headers.append('Content-Type', 'application/json');

        let body  = {
            email: email,
            password: btoa(password)
        }
        return fetch(`${API_URL}/auth/token/54bb2165-71e1-41a6-af3e-7da4a0e1e2c1`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        })
    }

    logout() {
        localStorage.removeItem('token')
    }
}
export let authApi = new AuthApi();
