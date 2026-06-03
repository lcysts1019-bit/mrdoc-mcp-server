export interface MrDocConfig {
    baseUrl: string;
    token: string;
    username: string;
    password: string;
}
export declare function loadConfig(): MrDocConfig;
