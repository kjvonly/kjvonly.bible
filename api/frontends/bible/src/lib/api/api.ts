import { BASE_URL, API_URL } from "$lib/utils/paths";
import { authService } from "$lib/services/auth.service";

export class Api {
    async fetchWithAuth(path: string, data: any): Promise<Response> {
        if (!authService.isLoggedIn()) {
            return new Promise((resolve, reject) => {
                resolve(new Response(JSON.stringify({
                    error: 'Unauthorized',
                    message: 'Authentication required.'
                }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }))
            });
        }

        if (data.headers) {
            data.headers.append('Authorization', `Bearer ${authService.getBearerToken()}`)
        }

        return await fetch(path,
            data
        );
    }

    async getstatic(path: string) {
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('Transfer-Encoding', 'gzip');

        let response = await fetch(`${BASE_URL}${path}`,
            {
                headers: myHeaders
            }
        );
        let data = await response.json();
        return data;
    }

    async get(path: string): Promise<Response> {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Transfer-Encoding', 'gzip');

        return await this.fetchWithAuth(`${API_URL}${path}`,
            {
                headers: headers
            }
        );
    }

    async post(path: string, data: any): Promise<Response> {
        const headers = new Headers()
        headers.append('Content-Type', 'application/json');
        return this.fetchWithAuth(`${API_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
    }

    async delete(path: string): Promise<Response> {
        let headers = new Headers()
        return this.fetchWithAuth(`${API_URL}${path}`, {
            method: 'DELETE',
            headers: headers,
        });
    }

    async update(path: string, data: any): Promise<Response> {
        const headers = new Headers()
        headers.append('Content-Type', 'application/json');
        return this.fetchWithAuth(`${API_URL}${path}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });
    }
}

export let api = new Api()