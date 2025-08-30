
const LOCAL_STORAGE_BEARER_TOKEN_NAME = 'token'

class AuthService {

    BEARER_TOKEN: string | null = null

    setBearerToekn(bearerToken: string) {
        this.BEARER_TOKEN = bearerToken
    }

    getBearerToken(){
        this.loadBearerToken()
        return this.BEARER_TOKEN
    }

    loadBearerToken() {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                let token = localStorage.getItem(LOCAL_STORAGE_BEARER_TOKEN_NAME)
                if (token) {
                    this.setBearerToekn(token)
                }
            } catch (e) {
                console.warn('Failed to access localStorage:', e);
            }
        }
    }

     clearBearerToken() {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            try {
                this.BEARER_TOKEN = null
                localStorage.deleteItem(LOCAL_STORAGE_BEARER_TOKEN_NAME)
            } catch (e) {
                console.warn('Failed to access localStorage:', e);
            }
        }
    }

    hasLoggedIn(): boolean {
        this.loadBearerToken()
        return this.BEARER_TOKEN !== null
    }

    isLoggedIn(): boolean{
        this.loadBearerToken()
        let exp  =  this.getJwtExpiryDate()
        if (!exp) {return false}
        return Date.now() < exp;
    }

    getJwtExpiryDate(): number | null{
        try {
            const payload = this.BEARER_TOKEN?.split('.')[1];
            if (!payload) { return null; }
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            if (!decoded.exp) { return null; }
            return decoded.exp * 1000;
        } catch (error) {
            console.error('Invalid token:', error);
            this.clearBearerToken()
            return null;
        }
    }
}


export let authService = new AuthService()