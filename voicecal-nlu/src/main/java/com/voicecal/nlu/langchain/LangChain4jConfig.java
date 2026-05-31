package com.voicecal.nlu.langchain;

import com.voicecal.core.service.CalendarService;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * LangChain4j configuration for the VoiceCal NLU module.
 * Supports switching between OpenAI (online) and Ollama (offline) LLM providers.
 */
@Slf4j
@Configuration
public class LangChain4jConfig {

    /**
     * Chat memory window size for multi-turn conversation.
     */
    @Bean
    public ChatMemory chatMemory(
            @Value("${voicecal.nlu.langchain.memory-window-size:20}") int windowSize) {
        log.info("Configuring ChatMemory with window size: {}", windowSize);
        return MessageWindowChatMemory.builder()
                .maxMessages(windowSize)
                .build();
    }

    /**
     * OpenAI-compatible ChatLanguageModel.
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "voicecal.nlu.langchain.provider", havingValue = "openai", matchIfMissing = true)
    public ChatLanguageModel openAiChatLanguageModel(
            @Value("${langchain4j.open-ai.chat-model.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${langchain4j.open-ai.chat-model.api-key}") String apiKey,
            @Value("${langchain4j.open-ai.chat-model.model-name:gpt-4o-mini}") String modelName,
            @Value("${langchain4j.open-ai.chat-model.temperature:0.3}") double temperature,
            @Value("${langchain4j.open-ai.chat-model.max-tokens:1024}") int maxTokens) {
        log.info("Creating OpenAI ChatLanguageModel: baseUrl={}, model={}", baseUrl, modelName);
        return OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .build();
    }

    /**
     * VoiceCalAssistant powered by OpenAI-compatible API.
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "voicecal.nlu.langchain.provider", havingValue = "openai", matchIfMissing = true)
    public VoiceCalAssistant openAiAssistant(
            ChatLanguageModel chatLanguageModel,
            ChatMemory chatMemory,
            CalendarTools calendarTools) {
        log.info("Creating VoiceCalAssistant with OpenAI model");
        return AiServices.builder(VoiceCalAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemory(chatMemory)
                .tools(calendarTools)
                .build();
    }

    /**
     * VoiceCalAssistant powered by Ollama.
     * Active when voicecal.nlu.langchain.provider=ollama.
     */
    @Bean
    @Primary
    @ConditionalOnProperty(name = "voicecal.nlu.langchain.provider", havingValue = "ollama")
    public VoiceCalAssistant ollamaAssistant(
            @org.springframework.beans.factory.annotation.Qualifier("ollamaChatLanguageModel") ChatLanguageModel chatLanguageModel,
            ChatMemory chatMemory,
            CalendarTools calendarTools) {
        log.info("Creating VoiceCalAssistant with Ollama model");
        return AiServices.builder(VoiceCalAssistant.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemory(chatMemory)
                .tools(calendarTools)
                .build();
    }
}
