"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifierService = exports.NotifierService = void 0;
// @ts-ignore
const coolsms_node_sdk_1 = __importDefault(require("coolsms-node-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class NotifierService {
    client;
    from;
    constructor() {
        const apiKey = process.env.COOLSMS_API_KEY;
        const apiSecret = process.env.COOLSMS_API_SECRET;
        this.from = process.env.COOLSMS_SENDER_NUMBER || '';
        if (apiKey && apiSecret) {
            this.client = new coolsms_node_sdk_1.default(apiKey, apiSecret);
        }
        else {
            console.warn('CoolSMS credentials missing. Notification will only log to console.');
        }
    }
    async sendSMS(to, message) {
        console.log(`[NOTIFY] Sending SMS to ${to}: ${message}`);
        if (!this.client) {
            return { success: true, error: 'Simulated: Credentials missing' };
        }
        try {
            const response = await this.client.sendOne({
                to,
                from: this.from,
                text: message
            });
            console.log('SMS Response:', response);
            return { success: true };
        }
        catch (error) {
            console.error('CoolSMS error:', error);
            return { success: false, error: error.message };
        }
    }
}
exports.NotifierService = NotifierService;
exports.notifierService = new NotifierService();
//# sourceMappingURL=notifier.js.map