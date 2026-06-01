package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.service.MusicService;
import com.yaozher.v1.vo.MusicPlaylistVo;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/music")
@RequiredArgsConstructor
public class MusicController {

    private final MusicService musicService;

    @GetMapping("/playlists")
    public Result<List<MusicPlaylistVo>> playlists() {
        return Result.ok(musicService.listPlaylists());
    }
}

