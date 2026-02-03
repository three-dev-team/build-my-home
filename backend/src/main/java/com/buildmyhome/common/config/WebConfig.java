package com.buildmyhome.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Value("${cors.allowed-origins}")
  private String allowedOrigins;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
      .addMapping("/**") // 모든 경로에 대해
      .allowedOrigins(allowedOrigins.split(",")) // YAML 설정값 사용
      .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
      .allowedHeaders("*")
      .allowCredentials(true);
  }
  @Override
  public void addResourceHandlers(org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
    String cwd = System.getProperty("user.dir");
    // Spring requires trailing slash for directory resource locations
    String path1 = java.nio.file.Paths.get(cwd, "uploads").toUri().toString() + "/";
    String path2 = java.nio.file.Paths.get(cwd, "backend", "uploads").toUri().toString() + "/";
    
    System.out.println("[WebConfig] Registering upload paths:");
    System.out.println("[WebConfig] path1 = " + path1);
    System.out.println("[WebConfig] path2 = " + path2);
    
    registry.addResourceHandler("/uploads/**")
            .addResourceLocations(path1, path2);
  }
}
