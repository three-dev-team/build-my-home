package com.buildmyhome.common.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Slf4j
@Controller
public class HomeController {

    // API 요청(/api/**)을 제외한 모든 경로를 index.html로 포워딩
//    @GetMapping({"/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
//    public String forward() {
//        return "forward:/index.html";
//    }

    @GetMapping({"/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}"})
    public String forward(HttpServletRequest request) {
        String uri = request.getRequestURI();

        //  웹소켓 연결 경로(/ws) 가로채기 X
        //  API 요청(/api)도 가로채면 안 됨
        if (uri.startsWith("/ws") || uri.startsWith("/api")) {
            return null; // 컨트롤러에서 처리하지 않고 스프링의 다음 핸들러로 넘김
        }
        log.info("Redirecting to index.html from path: {}", uri);
        return "forward:/index.html";
    }
}
