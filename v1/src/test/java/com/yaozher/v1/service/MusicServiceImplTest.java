package com.yaozher.v1.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.service.impl.MusicServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class MusicServiceImplTest {

    @TempDir
    Path tempDir;

    @Test
    void findsDownloadedLyricInCentralDirectoryWhenAudioNameIsReversed() throws Exception {
        Path musicRoot = tempDir.resolve("MusicForWeb");
        Path playlist = Files.createDirectories(musicRoot.resolve("Content"));
        Path lyrics = Files.createDirectories(musicRoot.resolve("LRCs"));
        Files.createFile(playlist.resolve("Closer-The Chainsmokers、Halsey.flac"));
        Files.writeString(
                lyrics.resolve("The Chainsmokers、Halsey - Closer-4effbde641d1ea25e1d20a2f0beaed08-112495686-000000DD.lrc"),
                "[00:01.00]Hey",
                StandardCharsets.UTF_8
        );

        MusicService service = service(musicRoot, lyrics);

        assertThat(service.findLyrics("Content/Closer-The Chainsmokers、Halsey.flac"))
                .isEqualTo("[00:01.00]Hey");
    }

    @Test
    void doesNotExposeCentralLyricsDirectoryAsPlaylist() throws Exception {
        Path musicRoot = tempDir.resolve("MusicForWeb");
        Path playlist = Files.createDirectories(musicRoot.resolve("Content"));
        Path lyrics = Files.createDirectories(musicRoot.resolve("LRCs"));
        Files.createFile(playlist.resolve("song-artist.mp3"));
        Files.writeString(lyrics.resolve("artist - song.lrc"), "[00:01.00]Line", StandardCharsets.UTF_8);

        MusicService service = service(musicRoot, lyrics);

        assertThat(service.listPlaylists())
                .extracting("name")
                .containsExactly("Content");
    }

    @Test
    void matchesUniqueTitleWhenAudioArtistIsUnknown() throws Exception {
        Path musicRoot = tempDir.resolve("MusicForWeb");
        Path playlist = Files.createDirectories(musicRoot.resolve("Content"));
        Path lyrics = Files.createDirectories(musicRoot.resolve("LRCs"));
        Files.createFile(playlist.resolve("Viva La Vida-未知作者.mp3"));
        Files.writeString(
                lyrics.resolve("Coldplay - Viva La Vida-d4cc45ef0caafb09a0b1e7f3a291eb30-524694667-00000000.lrc"),
                "[00:01.00]I used to rule the world",
                StandardCharsets.UTF_8
        );

        MusicService service = service(musicRoot, lyrics);

        assertThat(service.findLyrics("Content/Viva La Vida-未知作者.mp3"))
                .isEqualTo("[00:01.00]I used to rule the world");
    }

    private MusicService service(Path musicRoot, Path lyrics) {
        AppProperties properties = new AppProperties();
        properties.setMusicDir(musicRoot.toString());
        properties.setLyricDir(lyrics.toString());
        return new MusicServiceImpl(properties, new ObjectMapper());
    }
}
