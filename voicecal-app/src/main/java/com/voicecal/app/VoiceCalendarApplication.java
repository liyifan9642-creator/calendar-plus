package com.voicecal.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Main application class for Voice Calendar.
 */
@SpringBootApplication
@ComponentScan(basePackages = "com.voicecal")
@EnableJpaRepositories(basePackages = "com.voicecal.service.repository")
@EntityScan(basePackages = "com.voicecal.core.model")
@EnableConfigurationProperties
public class VoiceCalendarApplication {

    public static void main(String[] args) {
        SpringApplication.run(VoiceCalendarApplication.class, args);
    }
}
