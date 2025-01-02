import { base } from "$app/paths";

export class Api {


    async get(path: string) {
        let response = await fetch(`${base}/${path}`);
        let data = await response.json();
        return data;
    }

    async post(path: string, data: any): Promise<any> {
        const response = await fetch(location.origin + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        return result;

    }

}

export let api = new Api();