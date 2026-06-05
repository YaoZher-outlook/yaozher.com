package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yaozher.v1.dto.NewsDto;
import com.yaozher.v1.entity.BizNews;
import com.yaozher.v1.mapper.BizNewsMapper;
import com.yaozher.v1.service.NewsService;
import com.yaozher.v1.vo.PageResultVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsServiceImpl implements NewsService {

    private final BizNewsMapper newsMapper;

    @Override
    public PageResultVo<NewsDto> list(long page, long size, String keyword, String type) {
        Page<BizNews> p = new Page<>(page, size);

        LambdaQueryWrapper<BizNews> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            qw.and(w -> w.like(BizNews::getTitle, keyword)
                    .or()
                    .like(BizNews::getContent, keyword));
        }
        if (StringUtils.hasText(type)) {
            qw.eq(BizNews::getType, type);
        }
        qw.orderByDesc(BizNews::getCreateTime);

        Page<BizNews> result = newsMapper.selectPage(p, qw);

        List<NewsDto> dtos = result.getRecords().stream()
                .map(n -> NewsDto.builder()
                        .id(n.getId())
                        .title(n.getTitle())
                        .content(n.getContent())
                        .coverImage(n.getCoverImage())
                        .type(n.getType())
                        .createTime(n.getCreateTime())
                        .viewCount(n.getViewCount())
                        .build())
                .toList();

        return PageResultVo.<NewsDto>builder()
                .total(result.getTotal())
                .page(result.getCurrent())
                .size(result.getSize())
                .records(dtos)
                .build();
    }
}
