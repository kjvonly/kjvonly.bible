import { BASE_URL, API_URL } from "$lib/utils/paths";

export class Api {
    async get(path: string) {
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

    async post(path: string, data: any): Promise<any> {
        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        return result;

    }


    // Temp function while combinding frontend to backend
    async getapi(path: string): Promise<Response> {
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('Transfer-Encoding', 'gzip');

        let token = localStorage.getItem('token')
        if (token !== undefined) {
            myHeaders.append('Authorization', `Bearer ${token}`)
        }

        return await fetch(`${API_URL}${path}`,
            {
                headers: myHeaders
            }
        );

    }

    // Temp function while combinding frontend to backend
    async postapi(path: string, data: any): Promise<Response> {
        let headers: any = {
            'Content-Type': 'application/json'
        }

        let token = localStorage.getItem('token')
        if (token !== undefined) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

    }


    // Temp function while combinding frontend to backend
    async updateapi(path: string, data: any): Promise<Response> {
        let headers: any = {
            'Content-Type': 'application/json'
        }

        let token = localStorage.getItem('token')
        if (token !== undefined) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return fetch(`${API_URL}${path}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data)
        });

    }

}

export let api = new Api();