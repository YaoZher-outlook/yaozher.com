package com.yaozher.v1.service;

import com.yaozher.v1.dto.NewsDto;
import com.yaozher.v1.vo.PageResultVo;

public interface NewsService {

    PageResultVo<NewsDto> list(long page, long size, String keyword, String type);
}
