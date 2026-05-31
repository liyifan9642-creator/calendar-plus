package com.voicecal.nlu.time;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for parsing Chinese natural language time expressions into LocalDateTime objects.
 * Integrates the Time-NLP library (com.time.nlp) with fallback regex-based parsing.
 *
 * Supported patterns include:
 * - Relative dates: "明天", "后天", "三天后", "大后天"
 * - Fuzzy times: "下午", "傍晚", "早上", "中午"
 * - Compound expressions: "明天下午两点", "下周一上午十点"
 * - Absolute dates: "2024年3月15日", "3月15号下午3点"
 * - Day-of-week references: "下周三", "上周五"
 */
@Slf4j
@Service
public class TimeParserService {

    private static final DateTimeFormatter NORM_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final DateTimeFormatter NORM_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // Time-NLP library accessed via reflection (not on Maven Central)
    private Object timeNormalizer;
    private Method parseMethod;
    private Method getTimeUnitMethod;
    private Method getTimeNormMethod;
    private Method getIsAllDayTimeMethod;
    private Method getOriginMethod;

    // ========== Fallback regex patterns for common Chinese time expressions ==========

    /** Matches relative day references: 明天, 后天, 大后天, 昨天, 前天 */
    private static final Pattern RELATIVE_DAY_PATTERN = Pattern.compile(
            "(大后天|后天|明天|昨天|前天|今天|今晚)"
    );

    /** Matches "N天后" / "N天以后" style relative offsets (Arabic or Chinese numerals) */
    private static final Pattern DAYS_LATER_PATTERN = Pattern.compile(
            "([一二两三四五六七八九十\\d]+)\\s*天(?:以后|后)"
    );

    /** Matches "N个小时后" / "N小时后" */
    private static final Pattern HOURS_LATER_PATTERN = Pattern.compile(
            "(\\d+)\\s*(?:个)?小时(?:以后|后)"
    );

    /** Matches "N分钟后" / "N分钟以后" */
    private static final Pattern MINUTES_LATER_PATTERN = Pattern.compile(
            "(\\d+)\\s*分钟(?:以后|后)"
    );

    /** Matches week references: 下周一, 上周三, 本周五 */
    private static final Pattern WEEK_REF_PATTERN = Pattern.compile(
            "(上|下|本)(?:周|星期|礼拜)([一二三四五六日天])"
    );

    /** Matches fuzzy time-of-day: 早上, 上午, 中午, 下午, 傍晚, 晚上, 凌晨 */
    private static final Pattern TIME_OF_DAY_PATTERN = Pattern.compile(
            "(凌晨|早上|上午|中午|下午|傍晚|晚上|晚间)"
    );

    /** Matches explicit hour: "两点", "十点", "3点", "14点", "两点半", "十点十五分" */
    private static final Pattern HOUR_PATTERN = Pattern.compile(
            "(\\d|[一二两三四五六七八九十]+)\\s*点(?:(半|[一二三四五六七八九十\\d]+)\\s*分?)?"
    );

    /** Matches absolute dates: 2024年3月15日, 3月15号 */
    private static final Pattern ABSOLUTE_DATE_PATTERN = Pattern.compile(
            "(?:(\\d{2,4})\\s*年)?(\\d{1,2})\\s*月(\\d{1,2})\\s*[日号]"
    );

    /** Chinese numeral to integer mapping */
    private static final java.util.Map<String, Integer> CHINESE_NUM_MAP;
    static {
        java.util.Map<String, Integer> m = new java.util.HashMap<>();
        m.put("零", 0); m.put("一", 1); m.put("二", 2); m.put("两", 2);
        m.put("三", 3); m.put("四", 4); m.put("五", 5); m.put("六", 6);
        m.put("七", 7); m.put("八", 8); m.put("九", 9); m.put("十", 10);
        m.put("十一", 11); m.put("十二", 12); m.put("十三", 13);
        m.put("十四", 14); m.put("十五", 15); m.put("十六", 16);
        m.put("十七", 17); m.put("十八", 18); m.put("十九", 19);
        m.put("二十", 20); m.put("二十一", 21); m.put("二十二", 22);
        m.put("二十三", 23); m.put("二十四", 24);
        // half
        m.put("半", 30);
        CHINESE_NUM_MAP = Collections.unmodifiableMap(m);
    }

    /** Day-of-week Chinese character to java.time.DayOfWeek mapping */
    private static final java.util.Map<String, Integer> DOW_MAP;
    static {
        java.util.Map<String, Integer> m = new java.util.HashMap<>();
        m.put("一", 1); m.put("二", 2); m.put("三", 3); m.put("四", 4);
        m.put("五", 5); m.put("六", 6); m.put("日", 7); m.put("天", 7);
        DOW_MAP = Collections.unmodifiableMap(m);
    }

    @PostConstruct
    public void init() {
        try {
            Class<?> normalizerClass = Class.forName("com.time.nlp.TimeNormalizer");
            timeNormalizer = normalizerClass.getConstructor().newInstance();
            parseMethod = normalizerClass.getMethod("parse", String.class, String.class);
            getTimeUnitMethod = normalizerClass.getMethod("getTimeUnit");

            Class<?> timeUnitClass = Class.forName("com.time.nlp.TimeUnit");
            getTimeNormMethod = timeUnitClass.getMethod("getTimeNorm");
            getIsAllDayTimeMethod = timeUnitClass.getMethod("getIsAllDayTime");
            getOriginMethod = timeUnitClass.getMethod("getOrigin");

            log.info("TimeNormalizer initialized successfully");
        } catch (Exception e) {
            log.warn("Failed to initialize TimeNormalizer, will use fallback parser only: {}",
                    e.getMessage());
            timeNormalizer = null;
        }
    }

    /**
     * Parse a Chinese time expression into a list of TimeParseResult.
     * The base time defaults to the current system time.
     *
     * @param text the input text containing Chinese time expressions
     * @return list of parsed time results, empty if no time expression found
     */
    public List<TimeParseResult> parse(String text) {
        return parse(text, LocalDateTime.now());
    }

    /**
     * Parse a Chinese time expression into a list of TimeParseResult,
     * using the given base time for relative expressions.
     *
     * @param text     the input text containing Chinese time expressions
     * @param baseTime the reference time for relative expressions
     * @return list of parsed time results, empty if no time expression found
     */
    public List<TimeParseResult> parse(String text, LocalDateTime baseTime) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String trimmed = text.trim();
        log.debug("Parsing time expression: '{}' with base time: {}", trimmed, baseTime);

        // Try Time-NLP library first
        List<TimeParseResult> results = parseWithTimeNLP(trimmed, baseTime);
        if (!results.isEmpty()) {
            return results;
        }

        // Fall back to regex-based parsing
        log.debug("Time-NLP returned no results, using fallback parser for: '{}'", trimmed);
        results = parseWithFallback(trimmed, baseTime);
        return results;
    }

    /**
     * Parse and return the first (most likely) time result.
     *
     * @param text the input text containing Chinese time expressions
     * @return the parsed time result, or a result with null dateTime if not found
     */
    public TimeParseResult parseFirst(String text) {
        return parseFirst(text, LocalDateTime.now());
    }

    /**
     * Parse and return the first (most likely) time result.
     *
     * @param text     the input text
     * @param baseTime the reference time
     * @return the parsed time result
     */
    public TimeParseResult parseFirst(String text, LocalDateTime baseTime) {
        List<TimeParseResult> results = parse(text, baseTime);
        return results.isEmpty() ? TimeParseResult.builder()
                .originalExpression(text)
                .confidence(0.0)
                .build() : results.get(0);
    }

    // ==================== Time-NLP Library Integration ====================

    /**
     * Parse using the Time-NLP library (via reflection).
     */
    private List<TimeParseResult> parseWithTimeNLP(String text, LocalDateTime baseTime) {
        if (timeNormalizer == null) {
            return Collections.emptyList();
        }

        try {
            String baseTimeStr = baseTime.format(NORM_FORMATTER);
            parseMethod.invoke(timeNormalizer, text, baseTimeStr);
            Object[] timeUnits = (Object[]) getTimeUnitMethod.invoke(timeNormalizer);

            if (timeUnits == null || timeUnits.length == 0) {
                return Collections.emptyList();
            }

            List<TimeParseResult> results = new ArrayList<>();
            for (Object unit : timeUnits) {
                try {
                    TimeParseResult result = convertTimeUnit(unit, text, baseTime);
                    if (result != null && result.isParsed()) {
                        results.add(result);
                    }
                } catch (Exception e) {
                    log.warn("Failed to convert TimeUnit for text '{}': {}", text, e.getMessage());
                }
            }

            return results;
        } catch (Exception e) {
            log.warn("Time-NLP parsing failed for '{}': {}", text, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Convert a Time-NLP TimeUnit (accessed via reflection) into our TimeParseResult.
     */
    private TimeParseResult convertTimeUnit(Object unit, String originalText,
                                             LocalDateTime baseTime) throws Exception {
        String timeNorm = (String) getTimeNormMethod.invoke(unit);
        if (timeNorm == null || timeNorm.isBlank()) {
            return null;
        }

        boolean isAllDay = (boolean) getIsAllDayTimeMethod.invoke(unit);
        LocalDateTime dateTime = null;
        boolean ambiguous = false;
        String disambiguation = null;

        try {
            if (isAllDay) {
                LocalDate date = LocalDate.parse(timeNorm.trim(), NORM_DATE_FORMATTER);
                dateTime = date.atStartOfDay();
            } else {
                dateTime = LocalDateTime.parse(timeNorm.trim(), NORM_FORMATTER);
            }
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse normalized time string '{}': {}", timeNorm, e.getMessage());
            dateTime = tryParseFlexible(timeNorm);
        }

        if (dateTime != null) {
            int hour = dateTime.getHour();
            if (originalText.contains("下午") || originalText.contains("晚上")
                    || originalText.contains("傍晚") || originalText.contains("晚间")) {
                if (hour < 12) {
                    dateTime = dateTime.plusHours(12);
                    ambiguous = true;
                    disambiguation = "Expression contains PM marker, adjusted from "
                            + hour + ":00 to " + dateTime.getHour() + ":00";
                }
            } else if (originalText.contains("凌晨") || originalText.contains("早上")
                    || originalText.contains("上午")) {
                if (hour >= 12 && hour != 12) {
                    ambiguous = true;
                    disambiguation = "Expression contains AM marker, resolved to "
                            + hour + ":00";
                }
            }
        }

        double confidence = ambiguous ? 0.75 : 0.85;

        String origin = (String) getOriginMethod.invoke(unit);
        return TimeParseResult.builder()
                .dateTime(dateTime)
                .originalExpression(origin != null ? origin : originalText)
                .normalizedTime(timeNorm)
                .allDay(isAllDay)
                .wasAmbiguous(ambiguous)
                .disambiguationNote(disambiguation)
                .confidence(confidence)
                .build();
    }

    /**
     * Try to parse a time string with flexible formats.
     */
    private LocalDateTime tryParseFlexible(String timeNorm) {
        if (timeNorm == null) return null;
        String trimmed = timeNorm.trim();

        // Try date-only
        try {
            return LocalDate.parse(trimmed, NORM_DATE_FORMATTER).atStartOfDay();
        } catch (DateTimeParseException ignored) {}

        // Try with different separators
        try {
            String normalized = trimmed.replace("/", "-");
            return LocalDateTime.parse(normalized, NORM_FORMATTER);
        } catch (DateTimeParseException ignored) {}

        return null;
    }

    // ==================== Fallback Regex-Based Parser ====================

    /**
     * Fallback parser using regex patterns for common Chinese time expressions.
     * Used when the Time-NLP library is unavailable or fails to parse.
     */
    private List<TimeParseResult> parseWithFallback(String text, LocalDateTime baseTime) {
        List<TimeParseResult> results = new ArrayList<>();

        LocalDate datePart = resolveDate(text, baseTime);
        LocalTime timePart = resolveTime(text);

        // No date or time pattern matched — not a time expression
        if (datePart == null && timePart == null) {
            return Collections.emptyList();
        }

        // If only time was found without a date, default to the base date
        if (datePart == null) {
            datePart = baseTime.toLocalDate();
        }
        boolean allDay = (timePart == null);
        boolean ambiguous = false;
        String disambiguation = null;

        if (timePart == null) {
            timePart = defaultTimeForPeriod(text);
        }

        // Disambiguation for PM markers with low hours
        if (timePart.getHour() < 12) {
            boolean hasPmMarker = text.contains("下午") || text.contains("晚上")
                    || text.contains("傍晚") || text.contains("晚间");
            boolean hasAmMarker = text.contains("凌晨") || text.contains("早上")
                    || text.contains("上午");

            if (hasPmMarker) {
                timePart = timePart.plusHours(12);
                ambiguous = true;
                disambiguation = "PM marker detected, adjusted to afternoon";
            } else if (!hasAmMarker && timePart.getHour() >= 1 && timePart.getHour() <= 6) {
                // Ambiguous: "两点" without context -- could be AM or PM
                // Default to PM for user convenience in calendar context
                ambiguous = true;
                int originalHour = timePart.getHour();
                timePart = timePart.plusHours(12);
                disambiguation = "No AM/PM marker; defaulted to afternoon ("
                        + timePart.getHour() + ":00). "
                        + "Original was " + originalHour + ":00";
            }
        }

        LocalDateTime dateTime = LocalDateTime.of(datePart, timePart);

        results.add(TimeParseResult.builder()
                .dateTime(dateTime)
                .originalExpression(text)
                .normalizedTime(dateTime.format(NORM_FORMATTER))
                .allDay(allDay)
                .wasAmbiguous(ambiguous)
                .disambiguationNote(disambiguation)
                .confidence(0.70)
                .build());

        return results;
    }

    /**
     * Resolve the date part from a Chinese time expression.
     * Returns {@code null} when no date pattern matches.
     */
    private LocalDate resolveDate(String text, LocalDateTime baseTime) {
        LocalDate base = baseTime.toLocalDate();

        // Absolute date: 2024年3月15日
        Matcher absMatcher = ABSOLUTE_DATE_PATTERN.matcher(text);
        if (absMatcher.find()) {
            int year = absMatcher.group(1) != null ? Integer.parseInt(absMatcher.group(1)) : base.getYear();
            int month = Integer.parseInt(absMatcher.group(2));
            int day = Integer.parseInt(absMatcher.group(3));
            if (year < 100) year += 2000;
            try {
                return LocalDate.of(year, month, day);
            } catch (Exception e) {
                log.warn("Invalid absolute date: {}-{}-{}", year, month, day);
            }
        }

        // Relative day references
        Matcher relMatcher = RELATIVE_DAY_PATTERN.matcher(text);
        if (relMatcher.find()) {
            String word = relMatcher.group(1);
            switch (word) {
                case "今天":
                case "今晚":
                    return base;
                case "明天":
                    return base.plusDays(1);
                case "后天":
                    return base.plusDays(2);
                case "大后天":
                    return base.plusDays(3);
                case "昨天":
                    return base.minusDays(1);
                case "前天":
                    return base.minusDays(2);
            }
        }

        // "N天后"
        Matcher daysLaterMatcher = DAYS_LATER_PATTERN.matcher(text);
        if (daysLaterMatcher.find()) {
            int days = parseChineseNumber(daysLaterMatcher.group(1));
            if (days > 0) {
                return base.plusDays(days);
            }
        }

        // Week references: 下周一, 上周三, 本周五
        Matcher weekMatcher = WEEK_REF_PATTERN.matcher(text);
        if (weekMatcher.find()) {
            String direction = weekMatcher.group(1);
            String dowChar = weekMatcher.group(2);
            int targetDow = DOW_MAP.getOrDefault(dowChar, 1);
            int currentDow = base.getDayOfWeek().getValue();

            int offset;
            switch (direction) {
                case "下":
                    // Always land in the next calendar week (Mon–Sun).
                    int daysToNextMonday = (8 - currentDow) % 7;
                    if (daysToNextMonday == 0) daysToNextMonday = 7;
                    offset = daysToNextMonday + (targetDow - 1);
                    break;
                case "上":
                    offset = targetDow - currentDow;
                    if (offset >= 0) offset -= 7;
                    break;
                case "本":
                default:
                    offset = targetDow - currentDow;
                    if (offset < 0) offset += 7;
                    break;
            }
            return base.plusDays(offset);
        }

        // No date pattern matched
        return null;
    }

    /**
     * Resolve the time part from a Chinese time expression.
     */
    private LocalTime resolveTime(String text) {
        // Check for hour expression
        Matcher hourMatcher = HOUR_PATTERN.matcher(text);
        if (hourMatcher.find()) {
            int hour = parseChineseNumber(hourMatcher.group(1));
            int minute = 0;

            if (hourMatcher.group(2) != null) {
                minute = parseChineseNumber(hourMatcher.group(2));
            }

            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return LocalTime.of(hour, minute);
            }
        }

        // Check for "N个小时后" or "N分钟后"
        Matcher hoursLaterMatcher = HOURS_LATER_PATTERN.matcher(text);
        if (hoursLaterMatcher.find()) {
            int hours = Integer.parseInt(hoursLaterMatcher.group(1));
            return LocalTime.now().plusHours(hours);
        }

        Matcher minutesLaterMatcher = MINUTES_LATER_PATTERN.matcher(text);
        if (minutesLaterMatcher.find()) {
            int minutes = Integer.parseInt(minutesLaterMatcher.group(1));
            return LocalTime.now().plusMinutes(minutes);
        }

        return null;
    }

    /**
     * Return a sensible default time when the expression contains a time-of-day
     * marker (e.g. "晚上", "下午") but no explicit hour.
     */
    private LocalTime defaultTimeForPeriod(String text) {
        if (text.contains("凌晨"))   return LocalTime.of(6, 0);
        if (text.contains("早上"))   return LocalTime.of(8, 0);
        if (text.contains("上午"))   return LocalTime.of(9, 0);
        if (text.contains("中午"))   return LocalTime.of(12, 0);
        if (text.contains("下午"))   return LocalTime.of(14, 0);
        if (text.contains("傍晚"))   return LocalTime.of(18, 0);
        if (text.contains("晚上") || text.contains("晚间") || text.contains("今晚"))
            return LocalTime.of(19, 0);
        return LocalTime.MIDNIGHT;
    }

    /**
     * Parse a Chinese or Arabic numeral string into an integer.
     */
    private int parseChineseNumber(String numStr) {
        if (numStr == null || numStr.isBlank()) return 0;

        // Try Arabic numeral first
        try {
            return Integer.parseInt(numStr.trim());
        } catch (NumberFormatException ignored) {}

        // Look up in Chinese numeral map
        Integer mapped = CHINESE_NUM_MAP.get(numStr.trim());
        if (mapped != null) return mapped;

        // Handle compound Chinese numbers like "十一点" -> parse "十一"
        String trimmed = numStr.trim();
        if (trimmed.startsWith("十")) {
            Integer tens = CHINESE_NUM_MAP.get("十");
            if (trimmed.length() == 1) return tens;
            String rest = trimmed.substring(1);
            Integer ones = CHINESE_NUM_MAP.get(rest);
            if (ones != null) return tens + ones;
        }

        log.warn("Could not parse Chinese number: '{}'", numStr);
        return 0;
    }
}
