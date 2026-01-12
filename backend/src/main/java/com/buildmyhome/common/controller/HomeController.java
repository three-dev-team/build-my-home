package com.buildmyhome.common.controller;

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
}
