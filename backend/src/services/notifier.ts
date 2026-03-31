// @ts-ignore
import coolsms from 'coolsms-node-sdk';
import dotenv from 'dotenv';
dotenv.config();

export class NotifierService {
  private client: any;
  private from: string;

  constructor() {
    const apiKey = process.env.COOLSMS_API_KEY;
    const apiSecret = process.env.COOLSMS_API_SECRET;
    this.from = process.env.COOLSMS_SENDER_NUMBER || '';

    if (apiKey && apiSecret) {
      this.client = new coolsms(apiKey, apiSecret);
    } else {
      console.warn('CoolSMS credentials missing. Notification will only log to console.');
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
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
    } catch (error: any) {
      console.error('CoolSMS error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const notifierService = new NotifierService();
