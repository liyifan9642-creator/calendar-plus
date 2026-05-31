package com.voicecal.ui.javafx.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.voicecal.ui.javafx.model.ScheduleItem;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service bridge that communicates with the Voice Calendar REST API
 * to fetch and manage calendar events for the JavaFX UI.
 */
public class CalendarApiService {

    private static final Logger log = LoggerFactory.getLogger(CalendarApiService.class);
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final ObservableList<ScheduleItem> scheduleItems = FXCollections.observableArrayList();

    public CalendarApiService() {
        this("http://localhost:8080");
    }

    public CalendarApiService(String baseUrl) {
        this.baseUrl = baseUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Returns the observable list of schedule items.
     */
    public ObservableList<ScheduleItem> getScheduleItems() {
        return scheduleItems;
    }

    /**
     * Fetches today's events from the API asynchronously.
     */
    public void fetchTodayEvents() {
        LocalDateTime start = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime end = start.plusDays(1).minusNanos(1);
        fetchEvents(start, end, "today");
    }

    /**
     * Fetches this week's events from the API asynchronously.
     */
    public void fetchWeekEvents() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                .atStartOfDay();
        LocalDateTime end = start.plusDays(7).minusNanos(1);
        fetchEvents(start, end, "week");
    }

    /**
     * Fetches events in a date range from the REST API.
     */
    private void fetchEvents(LocalDateTime start, LocalDateTime end, String label) {
        String url = String.format("%s/api/v1/calendar/events?start=%s&end=%s",
                baseUrl, start.format(ISO_FMT), end.format(ISO_FMT));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .GET()
                .timeout(Duration.ofSeconds(15))
                .build();

        CompletableFuture.supplyAsync(() -> {
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return objectMapper.readValue(response.body(),
                            new TypeReference<List<Map<String, Object>>>() {});
                } else {
                    log.warn("Failed to fetch {} events, status: {}", label, response.statusCode());
                    return List.<Map<String, Object>>of();
                }
            } catch (Exception e) {
                log.error("Error fetching {} events: {}", label, e.getMessage());
                return List.<Map<String, Object>>of();
            }
        }).thenAccept(eventMaps -> {
            List<ScheduleItem> items = eventMaps.stream()
                    .map(this::mapToScheduleItem)
                    .collect(Collectors.toList());
            Platform.runLater(() -> {
                scheduleItems.setAll(items);
                log.info("Loaded {} {} events", items.size(), label);
            });
        });
    }

    /**
     * Maps a raw JSON map to a ScheduleItem.
     */
    @SuppressWarnings("unchecked")
    private ScheduleItem mapToScheduleItem(Map<String, Object> map) {
        ScheduleItem item = new ScheduleItem();
        item.setId((String) map.getOrDefault("id", ""));
        item.setTitle((String) map.getOrDefault("title", ""));
        item.setDescription((String) map.getOrDefault("description", ""));
        item.setLocation((String) map.getOrDefault("location", ""));
        item.setStatus((String) map.getOrDefault("status", "ACTIVE"));

        Object startObj = map.get("startTime");
        Object endObj = map.get("endTime");
        if (startObj instanceof List) {
            List<?> startList = (List<?>) startObj;
            if (startList.size() >= 5) {
                item.setStartTime(LocalDateTime.of(
                        toInt(startList.get(0)), toInt(startList.get(1)), toInt(startList.get(2)),
                        toInt(startList.get(3)), toInt(startList.get(4)),
                        startList.size() > 5 ? toInt(startList.get(5)) : 0));
            }
        } else if (startObj instanceof String) {
            item.setStartTime(LocalDateTime.parse((String) startObj));
        }

        if (endObj instanceof List) {
            List<?> endList = (List<?>) endObj;
            if (endList.size() >= 5) {
                item.setEndTime(LocalDateTime.of(
                        toInt(endList.get(0)), toInt(endList.get(1)), toInt(endList.get(2)),
                        toInt(endList.get(3)), toInt(endList.get(4)),
                        endList.size() > 5 ? toInt(endList.get(5)) : 0));
            }
        } else if (endObj instanceof String) {
            item.setEndTime(LocalDateTime.parse((String) endObj));
        }

        return item;
    }

    private int toInt(Object o) {
        if (o instanceof Number) return ((Number) o).intValue();
        return Integer.parseInt(o.toString());
    }

    /**
     * Sends a text command to the backend API for processing.
     * Uses query parameters as per API spec: POST /api/voice/process-text?text=xxx
     * Returns the JSON response as a string.
     */
    public CompletableFuture<String> processTextCommand(String text) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Encode text for URL
                String encodedText = java.net.URLEncoder.encode(text, java.nio.charset.StandardCharsets.UTF_8);
                String url = baseUrl + "/api/voice/process-text?text=" + encodedText;

                log.info("Calling backend API: {}", url);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .timeout(Duration.ofSeconds(30))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                log.info("Backend response: status={}, body={}", response.statusCode(), response.body());
                return response.body();
            } catch (Exception e) {
                log.error("Error processing text command: {}", e.getMessage());
                return "{\"success\": false, \"errorMessage\": \"" + e.getMessage() + "\"}";
            }
        });
    }

    /**
     * Sends a voice command audio file to the API for processing.
     * Returns the recognized text and intent.
     */
    public CompletableFuture<String> processVoiceCommand(byte[] audioData, String language) {
        // Build multipart form data boundary
        String boundary = "----VoiceCalBoundary" + System.currentTimeMillis();

        return CompletableFuture.supplyAsync(() -> {
            try {
                byte[] body = buildMultipartBody(boundary, audioData, language);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl + "/api/v1/voice/execute"))
                        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                        .timeout(Duration.ofSeconds(30))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                return response.body();
            } catch (Exception e) {
                log.error("Error processing voice command: {}", e.getMessage());
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        });
    }

    private byte[] buildMultipartBody(String boundary, byte[] audioData, String language) {
        String header = "--" + boundary + "\r\n" +
                "Content-Disposition: form-data; name=\"audio\"; filename=\"voice.wav\"\r\n" +
                "Content-Type: audio/wav\r\n\r\n";
        String mid = "\r\n--" + boundary + "\r\n" +
                "Content-Disposition: form-data; name=\"language\"\r\n\r\n" + language;
        String footer = "\r\n--" + boundary + "--\r\n";

        byte[] headerBytes = header.getBytes();
        byte[] midBytes = mid.getBytes();
        byte[] footerBytes = footer.getBytes();

        byte[] result = new byte[headerBytes.length + audioData.length + midBytes.length + footerBytes.length];
        int pos = 0;
        System.arraycopy(headerBytes, 0, result, pos, headerBytes.length); pos += headerBytes.length;
        System.arraycopy(audioData, 0, result, pos, audioData.length); pos += audioData.length;
        System.arraycopy(midBytes, 0, result, pos, midBytes.length); pos += midBytes.length;
        System.arraycopy(footerBytes, 0, result, pos, footerBytes.length);
        return result;
    }
}
