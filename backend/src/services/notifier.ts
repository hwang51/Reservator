import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

export class NotifierService {
  private bot: TelegramBot | null = null;
  private chatId: string;

  constructor() {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId  = process.env.TELEGRAM_CHAT_ID || '';

    if (token) {
      this.bot = new TelegramBot(token);
    } else {
      console.warn('[NOTIFY] TELEGRAM_BOT_TOKEN 없음 — 콘솔 출력만 합니다.');
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    // to 파라미터는 기존 인터페이스 호환용 (Telegram은 chat_id 사용)
    const targetChatId = to || this.chatId;
    console.log(`[NOTIFY] 텔레그램 전송 → chat_id=${targetChatId}\n${message}`);

    if (!this.bot) {
      console.warn('[NOTIFY] 봇 미설정 — 실제 전송 생략');
      return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
    }

    if (!targetChatId) {
      return { success: false, error: 'TELEGRAM_CHAT_ID not configured' };
    }

    try {
      await this.bot.sendMessage(targetChatId, message);
      console.log('[NOTIFY] 전송 성공');
      return { success: true };
    } catch (error: any) {
      console.error('[NOTIFY] 전송 실패:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const notifierService = new NotifierService();
