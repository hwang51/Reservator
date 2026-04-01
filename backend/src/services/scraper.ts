import puppeteer, { Browser, Page } from 'puppeteer';

// April 2026 weekend dates (Sat & Sun)
const APRIL_2026_WEEKENDS = [4, 5, 11, 12, 18, 19, 25, 26];

// Target grade keywords
const TARGET_GRADES = ['초2~3', '초3~4', '초2 ~3', '초3 ~4'];

export interface SlotResult {
  date: string;
  slots: string[];
}

export class ScraperService {
  async checkAvailability(url: string): Promise<{ available: boolean; message: string }> {
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // ── Step 1: info 페이지 로드 ─────────────────────────────────────────
      console.log('[SCRAPER] Step 1: 페이지 로드...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2000);

      // ── Step 2: 폼 제출 (신청시작 및 확인) ──────────────────────────────
      console.log('[SCRAPER] Step 2: 신청시작 및 확인...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
        page.evaluate(() => {
          const frm = (document as any).frm;
          if (frm) { frm.submit(); return; }
          const btn = Array.from(document.querySelectorAll('a, button, input'))
            .find(el => ((el as HTMLElement).innerText || (el as HTMLInputElement).value || '').includes('신청시작')) as HTMLElement;
          if (btn) btn.click();
        })
      ]);
      await delay(2000);

      // ── Step 3: "교육" 클릭 (<A> 태그 우선) ─────────────────────────────
      console.log('[SCRAPER] Step 3: 교육 클릭...');
      await clickAnchorByExactText(page, '교육');
      const eduLoaded = await waitForText(page, ['1일과정', '방문교육', '체험'], 8000);
      console.log(`[SCRAPER] 교육 메뉴 로드: ${eduLoaded}`);
      await delay(1000);

      // ── Step 4: "1일과정" 클릭 ────────────────────────────────────────────
      console.log('[SCRAPER] Step 4: 1일과정 클릭...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        clickAnchorByExactText(page, '1일과정'),
      ]);
      await delay(1000);

      // ── Step 5: 달력이 2026년 4월인지 확인 ────────────────────────────────
      console.log('[SCRAPER] Step 5: 달력 4월 확인...');
      await ensureApril2026(page);

      // ── Step 6: 토/일 날짜 순회 ───────────────────────────────────────────
      console.log('[SCRAPER] Step 6: 날짜 순회 시작...');
      const foundSlots: SlotResult[] = [];

      for (const day of APRIL_2026_WEEKENDS) {
        const dateLabel = `2026년 4월 ${day}일`;
        console.log(`[SCRAPER] 클릭: ${dateLabel}`);

        const clicked = await clickCalendarDay(page, day);
        if (!clicked) {
          console.warn(`[SCRAPER] ${day}일 달력 셀 없음 — 건너뜀`);
          continue;
        }

        // AJAX로 시간 목록이 로드될 때까지 대기 ("날짜를 먼저 선택하세요" 문구가 사라지거나 시간 정보가 나타날 때)
        await page.waitForFunction(
          () => !document.body.innerText.includes('날짜를 먼저 선택하세요'),
          { timeout: 5000 }
        ).catch(() => {}); // 타임아웃 시 — 해당 날짜에 슬롯 없음으로 간주
        await delay(500);

        const slots = await extractTargetSlots(page);
        if (slots.length > 0) {
          console.log(`[SCRAPER] ${dateLabel} 슬롯 발견: ${slots.join(' | ')}`);
          foundSlots.push({ date: dateLabel, slots });
        } else {
          console.log(`[SCRAPER] ${dateLabel}: 대상 슬롯 없음`);
        }
      }

      // ── 결과 반환 ──────────────────────────────────────────────────────────
      if (foundSlots.length > 0) {
        return { available: true, message: formatMessage(foundSlots) };
      }
      return { available: false, message: '4월 토/일 중 (초2~3) 또는 (초3~4) 신청 가능한 슬롯 없음' };

    } catch (error: any) {
      console.error('[SCRAPER] 오류:', error.message);
      return { available: false, message: `오류: ${error.message}` };
    } finally {
      if (browser) await browser.close();
    }
  }
}

// ── 헬퍼 함수들 ────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * <a> 태그 중 텍스트가 정확히 일치하는 것을 클릭한다.
 * <a>가 없으면 button → li → td 순으로 시도한다.
 */
async function clickAnchorByExactText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((target: string) => {
    const selectors = ['a', 'button', 'li', 'td', 'span', 'div'];
    for (const sel of selectors) {
      const el = Array.from(document.querySelectorAll(sel))
        .find(el => (el as HTMLElement).innerText?.trim() === target) as HTMLElement | undefined;
      if (el) { el.click(); return true; }
    }
    return false;
  }, text);
}

/** 특정 텍스트 중 하나가 body에 나타날 때까지 대기 */
async function waitForText(page: Page, texts: string[], timeout: number): Promise<boolean> {
  return page.waitForFunction(
    (ts: string[]) => ts.some(t => document.body.innerText.includes(t)),
    { timeout },
    texts
  ).then(() => true).catch(() => false);
}

/** 달력이 2026년 4월을 표시하도록 "다음" 버튼으로 이동 */
async function ensureApril2026(page: Page): Promise<void> {
  for (let i = 0; i < 24; i++) {
    const ok = await page.evaluate(() => {
      const t = document.body.innerText;
      return t.includes('2026') && (t.includes('4월') || t.includes('April'));
    });
    if (ok) return;

    const moved = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, td, span, div'));
      const next = btns.find(el => {
        const t = (el as HTMLElement).innerText?.trim();
        const title = (el as HTMLElement).getAttribute('title') || '';
        return t === '>' || t === '▶' || t === '→' || title.includes('다음') || t.includes('다음달');
      }) as HTMLElement | undefined;
      if (next) { next.click(); return true; }
      return false;
    });
    if (!moved) break;
    await delay(800);
  }
}

/** 달력에서 특정 일자의 <a> 태그를 클릭.
 *  날짜 셀 구조: <td class="ch"><a href="javascript:selDate('YYYY-MM-DD',...)"><b>DD</b></a></td>
 *  → td.ch 안의 <a>를 찾아 클릭한다. selDate()를 직접 호출하는 것과 동일한 효과.
 */
async function clickCalendarDay(page: Page, day: number): Promise<boolean> {
  const paddedDay = String(day).padStart(2, '0');
  const plainDay  = String(day);

  return page.evaluate((pd: string, nd: string) => {
    // td.ch 안의 a 태그 중 날짜 텍스트가 일치하는 것을 클릭
    const chCells = Array.from(document.querySelectorAll('td.ch'));
    for (let i = 0; i < chCells.length; i++) {
      const a = chCells[i].querySelector('a');
      if (!a) continue;
      const t = (a as HTMLElement).innerText?.trim();
      if (t === pd || t === nd) { (a as HTMLElement).click(); return true; }
    }
    // 폴백: 모든 <a> 태그에서 selDate 포함하는 href를 찾아 클릭
    const allA = Array.from(document.querySelectorAll('a[href*="selDate"]'));
    for (let i = 0; i < allA.length; i++) {
      const t = (allA[i] as HTMLElement).innerText?.trim();
      if (t === pd || t === nd) { (allA[i] as HTMLElement).click(); return true; }
    }
    return false;
  }, paddedDay, plainDay);
}

/** 현재 페이지에서 대상 학년 슬롯(초2~3, 초3~4)을 추출 */
async function extractTargetSlots(page: Page): Promise<string[]> {
  return page.evaluate((targets: string[]) => {
    const lines = document.body.innerText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);
    const found: string[] = [];
    for (const line of lines) {
      if (targets.some((t: string) => line.includes(t))) {
        const unavailable = ['마감', '접수종료', '신청불가', '정원초과'].some(k => line.includes(k));
        if (!unavailable) found.push(line.substring(0, 80));
      }
    }
    return [...new Set(found)];
  }, TARGET_GRADES);
}

/** SlotResult 배열을 텔레그램용 정리된 메시지로 변환 */
function formatMessage(slots: SlotResult[]): string {
  const DOW = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];

  const lines: string[] = ['🔔 예약 빈자리 알림\n'];

  for (const { date, slots: slotLines } of slots) {
    // date 예: "2026년 4월 5일"
    const m = date.match(/(\d{4})년 (\d+)월 (\d+)일/);
    const dowLabel = m
      ? DOW[new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay()]
      : '';
    lines.push(`📅 ${date} ${dowLabel}`);

    for (const slot of slotLines) {
      // 예: "10:40 창경궁의 아름다운 건축 (초2~3) 초2~3 [잔여: 3]"
      const timeMatch      = slot.match(/^(\d{2}:\d{2})/);
      const remainingMatch = slot.match(/\[잔여:\s*(\d+)\]/);
      const gradeMatch     = slot.match(/\((초[\d~]+)\)/);

      const time      = timeMatch      ? timeMatch[1]      : '';
      const remaining = remainingMatch ? remainingMatch[1] : '?';
      const grade     = gradeMatch     ? gradeMatch[1]     : '';

      // 과목명: 시간과 "(학년) 학년 [잔여:...]" 사이 텍스트
      const title = slot
        .replace(/^\d{2}:\d{2}\s*/, '')
        .replace(/\s*\([^)]*\).*$/, '')
        .trim();

      lines.push(`  ✅ ${time} ${title} (${grade}) — 잔여 ${remaining}석`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export const scraperService = new ScraperService();
