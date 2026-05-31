package com.voicecal.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Test-only Spring Boot application class for voicecal-service module.
 * Provides the @SpringBootConfiguration that @SpringBootTest requires
 * when running tests in isolation (without the voicecal-app module).
 */
@SpringBootApplication(scanBasePackages = {"com.voicecal.service", "com.voicecal.core"})
@EnableJpaRepositories(basePackages = "com.voicecal.service.repository")
@EntityScan(basePackages = "com.voicecal.core.model")
public class TestVoiceCalendarServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestVoiceCalendarServiceApplication.class, args);
    }
}
