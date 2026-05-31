package com.voicecal.service.repository;

import com.voicecal.core.model.RepeatRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Spring Data JPA repository for RepeatRule entities.
 */
@Repository
public interface RepeatRuleRepository extends JpaRepository<RepeatRule, UUID> {
}
