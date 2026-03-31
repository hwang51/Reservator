"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperService = exports.ScraperService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
class ScraperService {
    async checkAvailability(url) {
        let browser;
        try {
            browser = await puppeteer_1.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Set user agent to avoid basic bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            // Wait a bit for dynamic content
            await new Promise(r => setTimeout(r, 2000));
            const content = await page.content();
            // Check for '신청가능' text
            // Note: This is a heuristic. Depending on the actual site structure, this might need adjustment.
            const isAvailable = content.includes('신청가능') || content.includes('예약가능');
            // Also check for '마감' (Closed/Full)
            const isClosed = content.includes('마감') || content.includes('접수종료');
            if (isAvailable && !isClosed) {
                return { available: true, message: 'Reservation is available!' };
            }
            else if (isAvailable && isClosed) {
                // Some parts might be available, some closed.
                return { available: true, message: 'Partial reservation available!' };
            }
            else {
                return { available: false, message: 'Reservation is currently full or not yet open.' };
            }
        }
        catch (error) {
            console.error('Scraping error:', error.message);
            return { available: false, message: `Error: ${error.message}` };
        }
        finally {
            if (browser)
                await browser.close();
        }
    }
}
exports.ScraperService = ScraperService;
exports.scraperService = new ScraperService();
//# sourceMappingURL=scraper.js.map