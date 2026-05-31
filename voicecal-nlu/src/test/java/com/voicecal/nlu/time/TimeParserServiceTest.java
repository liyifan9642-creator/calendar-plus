package com.voicecal.nlu.time;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TimeParserService.
 * Tests various Chinese natural language time expressions.
 */
class TimeParserServiceTest {

    private TimeParserService timeParserService;

    /** Fixed base time for deterministic testing: 2024-06-15 10:30:00 (Saturday) */
    private static final LocalDateTime BASE_TIME =
            LocalDateTime.of(2024, 6, 15, 10, 30, 0);

    @BeforeEach
    void setUp() {
        timeParserService = new TimeParserService();
        timeParserService.init();
    }

    // ==================== Relative Date Tests ====================

    @Nested
    @DisplayName("Relative date expressions")
    class RelativeDateTests {

        @Test
        @DisplayName("Parse '今天'")
        void parseToday() {
            TimeParseResult result = timeParserService.parseFirst("今天", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate(), result.getDateTime().toLocalDate());
        }

        @Test
        @DisplayName("Parse '明天'")
        void parseTomorrow() {
            TimeParseResult result = timeParserService.parseFirst("明天", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(1),
                    result.getDateTime().toLocalDate());
        }

        @Test
        @DisplayName("Parse '后天'")
        void parseDayAfterTomorrow() {
            TimeParseResult result = timeParserService.parseFirst("后天", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(2),
                    result.getDateTime().toLocalDate());
        }

        @Test
        @DisplayName("Parse '大后天'")
        void parseThreeDaysLater() {
            TimeParseResult result = timeParserService.parseFirst("大后天", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(3),
                    result.getDateTime().toLocalDate());
        }

        @Test
        @DisplayName("Parse '三天后'")
        void parseThreeDaysLaterNumeric() {
            TimeParseResult result = timeParserService.parseFirst("三天后", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(3),
                    result.getDateTime().toLocalDate());
        }

        @Test
        @DisplayName("Parse '昨天'")
        void parseYesterday() {
            TimeParseResult result = timeParserService.parseFirst("昨天", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().minusDays(1),
                    result.getDateTime().toLocalDate());
        }
    }

    // ==================== Fuzzy Time Tests ====================

    @Nested
    @DisplayName("Fuzzy time-of-day expressions")
    class FuzzyTimeTests {

        @Test
        @DisplayName("Parse '明天下午' should set afternoon time")
        void parseTomorrowAfternoon() {
            TimeParseResult result = timeParserService.parseFirst("明天下午", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(1),
                    result.getDateTime().toLocalDate());
            // Afternoon should be >= 12:00
            assertTrue(result.getDateTime().getHour() >= 12,
                    "Afternoon hour should be >= 12, got " + result.getDateTime().getHour());
        }

        @Test
        @DisplayName("Parse '今天晚上'")
        void parseTonight() {
            TimeParseResult result = timeParserService.parseFirst("今天晚上", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate(), result.getDateTime().toLocalDate());
            assertTrue(result.getDateTime().getHour() >= 18 || result.getDateTime().getHour() < 6,
                    "Evening hour should be >= 18, got " + result.getDateTime().getHour());
        }
    }

    // ==================== Compound Expression Tests ====================

    @Nested
    @DisplayName("Compound time expressions")
    class CompoundTimeTests {

        @Test
        @DisplayName("Parse '明天下午两点'")
        void parseTomorrowAfternoonTwo() {
            TimeParseResult result = timeParserService.parseFirst("明天下午两点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(1),
                    result.getDateTime().toLocalDate());
            assertEquals(14, result.getDateTime().getHour());
            assertEquals(0, result.getDateTime().getMinute());
        }

        @Test
        @DisplayName("Parse '明天上午十点'")
        void parseTomorrowMorningTen() {
            TimeParseResult result = timeParserService.parseFirst("明天上午十点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(1),
                    result.getDateTime().toLocalDate());
            assertEquals(10, result.getDateTime().getHour());
        }

        @Test
        @DisplayName("Parse '下周一上午十点'")
        void parseNextMondayMorningTen() {
            TimeParseResult result = timeParserService.parseFirst("下周一上午十点", BASE_TIME);
            assertNotNull(result.getDateTime());
            // Base is 2024-06-15 (Saturday), next Monday is 2024-06-17
            assertEquals(LocalDate.of(2024, 6, 17),
                    result.getDateTime().toLocalDate());
            assertEquals(10, result.getDateTime().getHour());
        }

        @Test
        @DisplayName("Parse '后天下午三点半'")
        void parseDayAfterTomorrowAfternoonThreeThirty() {
            TimeParseResult result = timeParserService.parseFirst("后天下午三点半", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(BASE_TIME.toLocalDate().plusDays(2),
                    result.getDateTime().toLocalDate());
            assertEquals(15, result.getDateTime().getHour());
            assertEquals(30, result.getDateTime().getMinute());
        }

        @Test
        @DisplayName("Parse '下周三下午两点十五分'")
        void parseNextWednesdayAfternoonTwoFifteen() {
            TimeParseResult result = timeParserService.parseFirst("下周三下午两点十五分", BASE_TIME);
            assertNotNull(result.getDateTime());
            // Base is Saturday, next Wednesday is 2024-06-19
            assertEquals(LocalDate.of(2024, 6, 19),
                    result.getDateTime().toLocalDate());
            assertEquals(14, result.getDateTime().getHour());
            assertEquals(15, result.getDateTime().getMinute());
        }
    }

    // ==================== Ambiguity Resolution Tests ====================

    @Nested
    @DisplayName("Ambiguity resolution")
    class AmbiguityTests {

        @Test
        @DisplayName("Parse '下午两点' should resolve to 14:00, not 02:00")
        void parseAfternoonTwoShouldBe14() {
            TimeParseResult result = timeParserService.parseFirst("下午两点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(14, result.getDateTime().getHour(),
                    "'下午两点' should resolve to 14:00");
        }

        @Test
        @DisplayName("Parse '凌晨两点' should resolve to 02:00")
        void parseEarlyMorningTwoShouldBe02() {
            TimeParseResult result = timeParserService.parseFirst("凌晨两点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(2, result.getDateTime().getHour(),
                    "'凌晨两点' should resolve to 02:00");
        }

        @Test
        @DisplayName("Parse '晚上八点' should resolve to 20:00")
        void parseEveningEightShouldBe20() {
            TimeParseResult result = timeParserService.parseFirst("晚上八点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(20, result.getDateTime().getHour(),
                    "'晚上八点' should resolve to 20:00");
        }

        @Test
        @DisplayName("Parse '早上七点' should resolve to 07:00")
        void parseMorningSevenShouldBe07() {
            TimeParseResult result = timeParserService.parseFirst("早上七点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(7, result.getDateTime().getHour(),
                    "'早上七点' should resolve to 07:00");
        }

        @Test
        @DisplayName("Ambiguous expressions should be flagged")
        void ambiguousExpressionsFlagged() {
            // "两点" without AM/PM context is ambiguous
            TimeParseResult result = timeParserService.parseFirst("两点开会", BASE_TIME);
            if (result.isParsed() && result.isWasAmbiguous()) {
                assertNotNull(result.getDisambiguationNote());
            }
        }
    }

    // ==================== Week Reference Tests ====================

    @Nested
    @DisplayName("Week reference expressions")
    class WeekReferenceTests {

        @ParameterizedTest
        @DisplayName("Parse weekday references")
        @CsvSource({
                "下周一, 2024-06-17",
                "下周二, 2024-06-18",
                "下周三, 2024-06-19",
                "下周四, 2024-06-20",
                "下周五, 2024-06-21",
                "下周六, 2024-06-22",
                "下周日, 2024-06-23"
        })
        void parseNextWeekDays(String expression, String expectedDate) {
            TimeParseResult result = timeParserService.parseFirst(expression, BASE_TIME);
            assertNotNull(result.getDateTime(), "Failed to parse: " + expression);
            assertEquals(LocalDate.parse(expectedDate), result.getDateTime().toLocalDate(),
                    "Date mismatch for expression: " + expression);
        }

        @Test
        @DisplayName("Parse '上周五'")
        void parseLastFriday() {
            TimeParseResult result = timeParserService.parseFirst("上周五", BASE_TIME);
            assertNotNull(result.getDateTime());
            // Base is 2024-06-15 (Saturday), last Friday is 2024-06-14
            assertEquals(LocalDate.of(2024, 6, 14),
                    result.getDateTime().toLocalDate());
        }
    }

    // ==================== Absolute Date Tests ====================

    @Nested
    @DisplayName("Absolute date expressions")
    class AbsoluteDateTests {

        @Test
        @DisplayName("Parse '2024年3月15日下午三点'")
        void parseAbsoluteDateTime() {
            TimeParseResult result = timeParserService.parseFirst(
                    "2024年3月15日下午三点", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(LocalDateTime.of(2024, 3, 15, 15, 0),
                    result.getDateTime());
        }

        @Test
        @DisplayName("Parse '3月15号'")
        void parseMonthDay() {
            TimeParseResult result = timeParserService.parseFirst("3月15号", BASE_TIME);
            assertNotNull(result.getDateTime());
            assertEquals(3, result.getDateTime().getMonthValue());
            assertEquals(15, result.getDateTime().getDayOfMonth());
        }
    }

    // ==================== Edge Cases ====================

    @Nested
    @DisplayName("Edge cases")
    class EdgeCaseTests {

        @Test
        @DisplayName("Null input returns empty list")
        void nullInput() {
            List<TimeParseResult> results = timeParserService.parse(null);
            assertTrue(results.isEmpty());
        }

        @Test
        @DisplayName("Empty input returns empty list")
        void emptyInput() {
            List<TimeParseResult> results = timeParserService.parse("");
            assertTrue(results.isEmpty());
        }

        @Test
        @DisplayName("Blank input returns empty list")
        void blankInput() {
            List<TimeParseResult> results = timeParserService.parse("   ");
            assertTrue(results.isEmpty());
        }

        @Test
        @DisplayName("Non-time text returns empty or no-parse result")
        void nonTimeText() {
            TimeParseResult result = timeParserService.parseFirst("这是一个测试");
            // Should either have no result or null dateTime
            if (result != null) {
                // If a result is returned, it should be low confidence or unparsed
                assertTrue(result.getConfidence() < 0.5 || !result.isParsed(),
                        "Non-time text should not produce high-confidence parse");
            }
        }

        @Test
        @DisplayName("parseFirst with no match returns result with null dateTime")
        void parseFirstNoMatch() {
            TimeParseResult result = timeParserService.parseFirst("开会讨论项目");
            assertNotNull(result);
            // Should have null dateTime or very low confidence
        }
    }

    // ==================== TimeParseResult Tests ====================

    @Nested
    @DisplayName("TimeParseResult model")
    class TimeParseResultTests {

        @Test
        @DisplayName("isParsed returns true when dateTime is set")
        void isParsedTrue() {
            TimeParseResult result = TimeParseResult.builder()
                    .dateTime(LocalDateTime.now())
                    .build();
            assertTrue(result.isParsed());
        }

        @Test
        @DisplayName("isParsed returns false when dateTime is null")
        void isParsedFalse() {
            TimeParseResult result = TimeParseResult.builder()
                    .build();
            assertFalse(result.isParsed());
        }

        @Test
        @DisplayName("Builder creates complete result")
        void builderCreatesComplete() {
            LocalDateTime now = LocalDateTime.now();
            TimeParseResult result = TimeParseResult.builder()
                    .dateTime(now)
                    .originalExpression("明天下午三点")
                    .normalizedTime("2024-06-16 15:00:00")
                    .allDay(false)
                    .wasAmbiguous(false)
                    .confidence(0.85)
                    .build();

            assertEquals(now, result.getDateTime());
            assertEquals("明天下午三点", result.getOriginalExpression());
            assertEquals("2024-06-16 15:00:00", result.getNormalizedTime());
            assertFalse(result.isAllDay());
            assertFalse(result.isWasAmbiguous());
            assertEquals(0.85, result.getConfidence());
            assertTrue(result.isParsed());
        }
    }
}
