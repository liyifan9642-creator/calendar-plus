package com.voicecal.core.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Core domain model representing a user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    private UUID id;

    @NotBlank(message = "Username is required")
    private String username;

    @Email(message = "Valid email is required")
    private String email;

    private String displayName;

    private String timezone;

    private String languagePreference;
}