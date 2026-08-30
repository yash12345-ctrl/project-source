import { EventEmitter } from 'events';

class CaptchaService extends EventEmitter {
    private pendingRequests: Map<string, { 
        base64: string, 
        resolve: (text: string) => void, 
        reject: (reason: any) => void, 
        timeout: NodeJS.Timeout 
    }> = new Map();

    async requestManualCaptcha(username: string, base64: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Remove any existing pending request for this user
            if (this.pendingRequests.has(username)) {
                const existing = this.pendingRequests.get(username);
                clearTimeout(existing!.timeout);
                existing!.reject(new Error('Overridden by new request'));
            }

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(username);
                reject(new Error('Manual Captcha timeout'));
            }, 60000); // Wait 60 seconds

            this.pendingRequests.set(username, {
                base64,
                resolve: (text: string) => {
                    clearTimeout(timeout);
                    resolve(text);
                },
                reject: (err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                },
                timeout
            });
        });
    }

    submitCaptcha(username: string, text: string): boolean {
        const req = this.pendingRequests.get(username);
        if (req) {
            req.resolve(text);
            this.pendingRequests.delete(username);
            return true;
        }
        return false;
    }

    getPendingCaptcha(username: string): string | null {
        return this.pendingRequests.get(username)?.base64 || null;
    }
}

export const captchaService = new CaptchaService();
