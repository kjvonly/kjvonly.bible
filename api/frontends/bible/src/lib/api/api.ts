import { BASE_URL, API_URL } from "$lib/utils/paths";

export class Api {
    BEARER_TOKEN: string | null = null

    static withBerarToken(bearerToken: string): Api {
        let api = new Api()
        api.setBearerToekn(bearerToken)
        return api
    }

    loadBearerToken() {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                let token = localStorage.getItem('token')
                if (token) {
                    api.setBearerToekn(token)
                }
            } catch (e) {
                console.warn('Failed to access localStorage:', e);
            }
        }
    }

    async fetchWithAuth(path: string, data: any): Promise<Response> {
        this.loadBearerToken()

        if (data.headers && this.BEARER_TOKEN){
            data.headers.append('Authorization', `Bearer ${this.BEARER_TOKEN}`)
        }

        return await fetch(path,
            data
        );


    }

    setBearerToekn(bearerToken: string) {
        this.BEARER_TOKEN = bearerToken
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