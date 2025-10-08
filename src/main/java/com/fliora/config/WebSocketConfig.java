package com.fliora.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Bean(name = "webSocketTaskScheduler")
    public TaskScheduler webSocketTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2); // Reduced from default ~50 to save memory
        scheduler.setThreadNamePrefix("websocket-heartbeat-");
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(5);
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic")
                .setTaskScheduler(webSocketTaskScheduler())
                .setHeartbeatValue(new long[]{20000, 20000}); // Heartbeat every 20s
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setStreamBytesLimit(512 * 1024) // 512KB limit
                .setHttpMessageCacheSize(100) // Reduced cache
                .setDisconnectDelay(5000); // 5s disconnect delay
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Optimize buffer sizes and limits to reduce memory
        registration
                .setMessageSizeLimit(64 * 1024) // 64KB per message
                .setSendBufferSizeLimit(512 * 1024) // 512KB send buffer
                .setSendTimeLimit(20000) // 20s timeout
                .setTimeToFirstMessage(30000); // 30s to first message
    }
}