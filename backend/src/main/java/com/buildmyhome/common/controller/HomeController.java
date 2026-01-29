package com.buildmyhome.common.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

  @GetMapping(
    value = {
      "/",
      "/{path:^(?!api$|ws$|assets$|images$|sounds$|videos$|oauth2$|login$|error$)[^\\.]*}",
      "/{path:^(?!api$|ws$|assets$|images$|sounds$|videos$|oauth2$|login$|error$)[^\\.]*}/**",
    }
  )
  public String forwardToIndex() {
    return "forward:/index.html";
  }
}
