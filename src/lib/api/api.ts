import { base } from "$lib/utils/paths";

export class Api {


    async get(path: string) {
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append('Transfer-Encoding', 'gzip');

        let response = await fetch(`${base}${path}`,
            {
				headers: myHeaders
			}
        );
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