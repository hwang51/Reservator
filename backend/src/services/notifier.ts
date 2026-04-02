import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { db } from '../db';
import { recipients } from '../db/schema';
dotenv.config();

export class NotifierService {
  private bot: TelegramBot | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (token) {
      this.bot = new TelegramBot(token);
    } else {
      console.warn('[NOTIFY] TELEGRAM_BOT_TOKEN 없음 — 콘솔 출력만 합니다.');
    }
  }

  private async getChatIds(): Promise<string[]> {
    const rows = await db.select({ chatId: recipients.chatId }).from(recipients);
    return rows.map(r => r.chatId);
  }

  async sendSMS(_to: string, message: string): Promise<{ success: boolean; error?: string }> {
    const targetIds = await this.getChatIds();

    console.log(`[NOTIFY] 텔레그램 전송 → chat_ids=${targetIds.join(', ')}\n${message}`);

    if (!this.bot) {
      console.warn('[NOTIFY] 봇 미설정 — 실제 전송 생략');
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
    }

    if (targetIds.length === 0) {
      return { success: false, error: '등록된 수신자가 없습니다' };
    }

    const errors: string[] = [];
    for (const chatId of targetIds) {
      try {
        await this.bot.sendMessage(chatId, message);
        console.log(`[NOTIFY] 전송 성공 → ${chatId}`);
      } catch (error: any) {
        console.error(`[NOTIFY] 전송 실패 → ${chatId}:`, error.message);
        errors.push(`${chatId}: ${error.message}`);
      }
    }

    return errors.length === 0
      ? { success: true }
      : { success: errors.length < targetIds.length, error: errors.join('; ') };
  }
}

export const notifierService = new NotifierService();
