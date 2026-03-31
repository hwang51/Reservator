export declare class NotifierService {
    private client;
    private from;
    constructor();
    sendSMS(to: string, message: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
export declare const notifierService: NotifierService;
//# sourceMappingURL=notifier.d.ts.map