package com.yaozher.v1.service.impl;

import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.service.MusicService;
import com.yaozher.v1.vo.MusicPlaylistVo;
import com.yaozher.v1.vo.MusicTrackVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MusicServiceImpl implements MusicService {

    private static final List<String> SUPPORTED_EXTENSIONS = List.of(".mp3", ".flac", ".wav", ".ogg", ".m4a");

    private final AppProperties appProperties;

    @Override
    public List<MusicPlaylistVo> listPlaylists() {
        Path root = Paths.get(StringUtils.hasText(appProperties.getMusicDir())
                        ? appProperties.getMusicDir()
                        : "./music-library")
                .toAbsolutePath()
                .normalize();
        if (!Files.isDirectory(root)) {
            return List.of();
        }

        try (Stream<Path> playlists = Files.list(root)) {
            return playlists
                    .filter(Files::isDirectory)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
                    .map(p -> toPlaylist(root, p))
                    .filter(p -> !p.getTracks().isEmpty())
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private MusicPlaylistVo toPlaylist(Path root, Path playlistDir) {
        String name = playlistDir.getFileName().toString();
        try (Stream<Path> files = Files.list(playlistDir)) {
            List<MusicTrackVo> tracks = files
                    .filter(Files::isRegularFile)
                    .filter(this::isSupported)
                    .sorted(Comparator.comparing(p -> p.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
                    .map(file -> toTrack(root, name, file))
                    .toList();
            return MusicPlaylistVo.builder()
                    .id(name)
                    .name(name)
                    .tracks(tracks)
                    .build();
        } catch (Exception e) {
            return MusicPlaylistVo.builder()
                    .id(name)
                    .name(name)
                    .tracks(List.of())
                    .build();
        }
    }

    private MusicTrackVo toTrack(Path root, String playlistName, Path file) {
        String fileName = file.getFileName().toString();
        String baseName = stripExtension(fileName);
        ParsedTrack parsed = parseTrack(baseName);
        String relative = root.relativize(file).toString().replace('\\', '/');
        String url = "/music/" + Stream.of(relative.split("/"))
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .reduce((a, b) -> a + "/" + b)
                .orElse(fileName);

        return MusicTrackVo.builder()
                .id(playlistName + "/" + fileName)
                .title(parsed.title())
                .artist(parsed.artist())
                .fileName(fileName)
                .url(url)
                .build();
    }

    private boolean isSupported(Path file) {
        String lower = file.getFileName().toString().toLowerCase(Locale.ROOT);
        return SUPPORTED_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private String stripExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot > 0 ? fileName.substring(0, dot) : fileName;
    }

    private ParsedTrack parseTrack(String baseName) {
        String[] parts = baseName.split("\\s+-\\s+", 2);
        if (parts.length == 2 && StringUtils.hasText(parts[0]) && StringUtils.hasText(parts[1])) {
            return new ParsedTrack(parts[1].trim(), parts[0].trim());
        }
        return new ParsedTrack(baseName.trim(), "Unknown Artist");
    }

    private record ParsedTrack(String title, String artist) {
    }
}

