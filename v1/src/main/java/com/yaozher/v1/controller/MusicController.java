package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.service.MusicService;
import com.yaozher.v1.vo.MusicPlaylistVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/music")
@RequiredArgsConstructor
public class MusicController {

    private final MusicService musicService;

    @GetMapping("/playlists")
    public Result<List<MusicPlaylistVo>> playlists() {
        return Result.ok(musicService.listPlaylists());
    }

    @GetMapping("/cover")
    public Result<String> cover(@RequestParam(required = false) String artist,
                                @RequestParam String title) {
        return Result.ok(musicService.findOnlineCover(artist, title));
    }

    @GetMapping("/lyrics")
    public ResponseEntity<String> lyrics(@RequestParam String trackId) {
        String lyrics = musicService.findLyrics(trackId);
        if (lyrics == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .body(lyrics);
    }
}
