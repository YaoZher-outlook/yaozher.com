package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.NewsDto;
import com.yaozher.v1.service.NewsService;
import com.yaozher.v1.vo.PageResultVo;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/list")
    public Result<PageResultVo<NewsDto>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "10") long size
    ) {
        return Result.ok(newsService.list(page, size));
    }
}
