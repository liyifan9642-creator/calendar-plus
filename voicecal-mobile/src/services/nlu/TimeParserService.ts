import dayjs from 'dayjs';

// Chinese numeral mapping
const CHINESE_NUM_MAP: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2,
  '三': 3, '四': 4, '五': 5, '六': 6,
  '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19,
  '二十': 20, '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24,
  '半': 30,
};

// Day of week mapping (Monday=1 ... Sunday=7)
const DOW_MAP: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
};

// Default time for time-of-day periods
const DEFAULT_TIME_FOR_PERIOD: Record<string, string> = {
  '凌晨': '06:00',
  '早上': '08:00',
  '上午': '09:00',
  '中午': '12:00',
  '下午': '14:00',
  '傍晚': '18:00',
  '晚上': '19:00',
  '晚间': '19:00',
  '今晚': '19:00',
};

export interface TimeParseResult {
  /** ISO datetime string (YYYY-MM-DDTHH:mm:ss) or null if unparseable */
  dateTime: string | null;
  /** Date portion as YYYY-MM-DD */
  date: string | null;
  /** Time portion as HH:mm */
  time: string | null;
  /** The original input text that was parsed */
  originalExpression: string;
  /** Whether AM/PM disambiguation was applied */
  wasAmbiguous: boolean;
  /** Explanation of any disambiguation that was applied */
  disambiguationNote?: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
}

// ========== Regex patterns (ported from Java, with Unicode flag for JS) ==========

/** Absolute date: 2024年3月15日, 3月15号 */
const ABSOLUTE_DATE_PATTERN = /(?:(\d{2,4})\s*年)?(\d{1,2})\s*月(\d{1,2})\s*[日号]/u;

/** Relative day references */
const RELATIVE_DAY_PATTERN = /(大后天|后天|明天|昨天|前天|今天|今晚)/u;

/** "N天后" / "N天以后" (Arabic or Chinese numerals) */
const DAYS_LATER_PATTERN = /([一二两三四五六七八九十\d]+)\s*天(?:以后|后)/u;

/** "N个小时后" / "N小时后" */
const HOURS_LATER_PATTERN = /(\d+)\s*(?:个)?小时(?:以后|后)/u;

/** "N分钟后" / "N分钟以后" */
const MINUTES_LATER_PATTERN = /(\d+)\s*分钟(?:以后|后)/u;

/** Week references: 下周一, 上周三, 本周五 */
const WEEK_REF_PATTERN = /(上|下|本)(?:周|星期|礼拜)([一二三四五六日天])/u;

/** Explicit hour: "两点", "十点", "3点", "两点半", "十点十五分" */
const HOUR_PATTERN = /(\d|[一二两三四五六七八九十]+)\s*点(?:(半|[一二三四五六七八九十\d]+)\s*分?)?/u;

// ========== Service ==========

/**
 * Service for parsing Chinese natural language time expressions into
 * structured date/time values.  Ported from the Java TimeParserService
 * fallback regex-based parser.
 */
export const TimeParserService = {
  /**
   * Parse a Chinese or Arabic numeral string into an integer.
   *
   * Handles:
   * - Arabic digits via parseInt
   * - Single Chinese chars from CHINESE_NUM_MAP
   * - Compound forms: "十一" (11), "二十" (20), "二十一" (21)
   * - "半" returns 30
   */
  parseChineseNumber(str: string): number {
    if (!str || !str.trim()) return 0;

    const trimmed = str.trim();

    // Try Arabic numeral first
    const asInt = parseInt(trimmed, 10);
    if (!isNaN(asInt)) return asInt;

    // Direct lookup in the map (covers single chars, compound entries, and "半")
    if (CHINESE_NUM_MAP[trimmed] !== undefined) {
      return CHINESE_NUM_MAP[trimmed];
    }

    // Handle compound Chinese numbers starting with "十"
    // e.g. "十" -> 10, "十一" -> 11, "十二" -> 12 ...
    if (trimmed.startsWith('十')) {
      const tens = CHINESE_NUM_MAP['十']; // 10
      if (trimmed.length === 1) return tens;
      const rest = trimmed.substring(1);
      const ones = CHINESE_NUM_MAP[rest];
      if (ones !== undefined) return tens + ones;
    }

    return 0;
  },

  /**
   * Resolve the date part from a Chinese time expression.
   * Returns a YYYY-MM-DD string or null when no date pattern matches.
   *
   * @param text     the input text
   * @param baseDate reference date for relative expressions (YYYY-MM-DD)
   */
  resolveDate(text: string, baseDate: string): string | null {
    const base = dayjs(baseDate);

    // 1. Absolute date: 2024年3月15日 / 3月15号
    const absMatch = ABSOLUTE_DATE_PATTERN.exec(text);
    if (absMatch) {
      let year = absMatch[1] != null ? parseInt(absMatch[1], 10) : base.year();
      const month = parseInt(absMatch[2], 10);
      const day = parseInt(absMatch[3], 10);
      if (year < 100) year += 2000;
      try {
        const candidate = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        if (candidate.isValid()) return candidate.format('YYYY-MM-DD');
      } catch {
        // invalid date, fall through
      }
    }

    // 2. Relative day references
    const relMatch = RELATIVE_DAY_PATTERN.exec(text);
    if (relMatch) {
      const word = relMatch[1];
      switch (word) {
        case '今天':
        case '今晚':
          return base.format('YYYY-MM-DD');
        case '明天':
          return base.add(1, 'day').format('YYYY-MM-DD');
        case '后天':
          return base.add(2, 'day').format('YYYY-MM-DD');
        case '大后天':
          return base.add(3, 'day').format('YYYY-MM-DD');
        case '昨天':
          return base.subtract(1, 'day').format('YYYY-MM-DD');
        case '前天':
          return base.subtract(2, 'day').format('YYYY-MM-DD');
      }
    }

    // 3. "N天后" / "N天以后"
    const daysLaterMatch = DAYS_LATER_PATTERN.exec(text);
    if (daysLaterMatch) {
      const days = this.parseChineseNumber(daysLaterMatch[1]);
      if (days > 0) {
        return base.add(days, 'day').format('YYYY-MM-DD');
      }
    }

    // 4. Week references: 下周一, 上周三, 本周五
    const weekMatch = WEEK_REF_PATTERN.exec(text);
    if (weekMatch) {
      const direction = weekMatch[1];
      const dowChar = weekMatch[2];
      const targetDow = DOW_MAP[dowChar] ?? 1;
      const currentDow = base.day() === 0 ? 7 : base.day(); // dayjs: 0=Sun

      let offset: number;
      switch (direction) {
        case '下': {
          // Always land in the next calendar week (Mon-Sun).
          let daysToNextMonday = (8 - currentDow) % 7;
          if (daysToNextMonday === 0) daysToNextMonday = 7;
          offset = daysToNextMonday + (targetDow - 1);
          break;
        }
        case '上': {
          offset = targetDow - currentDow;
          if (offset >= 0) offset -= 7;
          break;
        }
        case '本':
        default: {
          offset = targetDow - currentDow;
          if (offset < 0) offset += 7;
          break;
        }
      }
      return base.add(offset, 'day').format('YYYY-MM-DD');
    }

    // No date pattern matched
    return null;
  },

  /**
   * Resolve the time part from a Chinese time expression.
   * Returns HH:mm or null.
   *
   * @param text the input text
   */
  resolveTime(text: string): string | null {
    // 1. Explicit hour expression: "两点", "十点半", "3点十五分"
    const hourMatch = HOUR_PATTERN.exec(text);
    if (hourMatch) {
      const hour = this.parseChineseNumber(hourMatch[1]);
      let minute = 0;

      if (hourMatch[2] != null) {
        minute = this.parseChineseNumber(hourMatch[2]);
      }

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
    }

    // 2. "N个小时后" / "N小时后"
    const hoursLaterMatch = HOURS_LATER_PATTERN.exec(text);
    if (hoursLaterMatch) {
      const hours = parseInt(hoursLaterMatch[1], 10);
      return dayjs().add(hours, 'hour').format('HH:mm');
    }

    // 3. "N分钟后"
    const minutesLaterMatch = MINUTES_LATER_PATTERN.exec(text);
    if (minutesLaterMatch) {
      const minutes = parseInt(minutesLaterMatch[1], 10);
      return dayjs().add(minutes, 'minute').format('HH:mm');
    }

    return null;
  },

  /**
   * Check if text contains any time-of-day keywords and return the default
   * time for that period. Returns '00:00' if no period keyword is found.
   *
   * @param text the input text
   */
  defaultTimeForPeriod(text: string): string {
    // Check each period keyword in order; first match wins
    for (const [keyword, time] of Object.entries(DEFAULT_TIME_FOR_PERIOD)) {
      if (text.includes(keyword)) {
        return time;
      }
    }
    return '00:00';
  },

  /**
   * AM/PM disambiguation for parsed hour values.
   *
   * - If hour < 12 and text contains PM markers ("下午", "晚上", "傍晚", "晚间"),
   *   add 12 to the hour.
   * - If no marker at all and hour is 1-6, default to PM (add 12) for user
   *   convenience in a calendar context.
   *
   * @param hour  the parsed hour (0-23)
   * @param minute the parsed minute (kept as-is, included in return for convenience)
   * @param text  the original input text
   */
  disambiguateTime(
    hour: number,
    minute: number,
    text: string,
  ): { hour: number; wasAmbiguous: boolean; note?: string } {
    const hasPmMarker =
      text.includes('下午') ||
      text.includes('晚上') ||
      text.includes('傍晚') ||
      text.includes('晚间');

    const hasAmMarker =
      text.includes('凌晨') ||
      text.includes('早上') ||
      text.includes('上午');

    if (hour < 12) {
      if (hasPmMarker) {
        return {
          hour: hour + 12,
          wasAmbiguous: true,
          note: '检测到下午/晚上标记，已调整为下午时间',
        };
      }

      if (!hasAmMarker && hour >= 1 && hour <= 6) {
        // Ambiguous: "两点" without context -- could be AM or PM.
        // Default to PM for user convenience in calendar context.
        return {
          hour: hour + 12,
          wasAmbiguous: true,
          note: `未检测到上午/下午标记，默认为下午（${hour + 12}:00），原始时间为${hour}:00`,
        };
      }
    }

    return { hour, wasAmbiguous: false };
  },

  /**
   * Main entry point. Parse a Chinese time expression and return a structured
   * result with date, time, confidence, and disambiguation info.
   *
   * @param text      the input text containing Chinese time expressions
   * @param baseDate  optional reference date as YYYY-MM-DD (defaults to today)
   */
  parse(text: string, baseDate?: string): TimeParseResult {
    const base = baseDate ?? dayjs().format('YYYY-MM-DD');

    if (!text || !text.trim()) {
      return {
        dateTime: null,
        date: null,
        time: null,
        originalExpression: text ?? '',
        wasAmbiguous: false,
        confidence: 0,
      };
    }

    const trimmed = text.trim();

    // Resolve date and time independently
    let datePart = this.resolveDate(trimmed, base);
    let timePart = this.resolveTime(trimmed);

    // No date or time pattern matched -- not a time expression
    if (datePart === null && timePart === null) {
      return {
        dateTime: null,
        date: null,
        time: null,
        originalExpression: trimmed,
        wasAmbiguous: false,
        confidence: 0,
      };
    }

    // If only time was found without a date, default to the base date
    const allDay = timePart === null;
    if (datePart === null) {
      datePart = base;
    }

    let ambiguous = false;
    let disambiguation: string | undefined;

    // If no explicit time was found, supply a default based on period keywords
    if (timePart === null) {
      timePart = this.defaultTimeForPeriod(trimmed);
    }

    // Apply AM/PM disambiguation
    const [hourStr, minuteStr] = timePart.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (!allDay) {
      const result = this.disambiguateTime(hour, minute, trimmed);
      hour = result.hour;
      ambiguous = result.wasAmbiguous;
      disambiguation = result.note;
    }

    const finalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const dateTime = `${datePart}T${finalTime}:00`;

    return {
      dateTime,
      date: datePart,
      time: finalTime,
      originalExpression: trimmed,
      wasAmbiguous: ambiguous,
      disambiguationNote: disambiguation,
      confidence: 0.70,
    };
  },
};
