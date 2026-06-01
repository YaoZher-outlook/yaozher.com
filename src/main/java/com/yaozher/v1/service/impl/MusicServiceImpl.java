package com.yaozher.v1.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.service.MusicService;
import com.yaozher.v1.vo.MusicPlaylistVo;
import com.yaozher.v1.vo.MusicTrackVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MusicServiceImpl implements MusicService {

    private static final List<String> SUPPORTED_EXTENSIONS = List.of(".mp3", ".flac", ".wav", ".ogg", ".m4a");
    private static final List<String> IMAGE_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");
    private static final Set<String> GENERIC_COVER_NAMES = Set.of("cover", "folder", "front", "album");
    private static final String NO_COVER = "__NO_COVER__";

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final Map<String, String> onlineCoverCache = new ConcurrentHashMap<>();

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
                    .map(file -> toTrack(root, playlistDir, name, file))
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

    @Override
    public String findOnlineCover(String artist, String title) {
        String cleanTitle = title == null ? "" : title.trim();
        String cleanArtist = normalizeArtist(artist);
        if (!StringUtils.hasText(cleanTitle)) {
            return null;
        }

        String key = (cleanArtist + "|" + cleanTitle).toLowerCase(Locale.ROOT);
        String cached = onlineCoverCache.get(key);
        if (cached != null) {
            return NO_COVER.equals(cached) ? null : cached;
        }

        String query = "Unknown Artist".equals(cleanArtist) ? cleanTitle : cleanTitle + " " + cleanArtist;
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            URI uri = URI.create("https://itunes.apple.com/search?entity=song&limit=1&term=" + encoded);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                onlineCoverCache.put(key, NO_COVER);
                return null;
            }

            JsonNode results = objectMapper.readTree(response.body()).path("results");
            if (!results.isArray() || results.isEmpty()) {
                onlineCoverCache.put(key, NO_COVER);
                return null;
            }

            String artwork = results.get(0).path("artworkUrl100").asText(null);
            if (!StringUtils.hasText(artwork)) {
                onlineCoverCache.put(key, NO_COVER);
                return null;
            }

            String cover = artwork.replace("100x100bb", "600x600bb");
            onlineCoverCache.put(key, cover);
            return cover;
        } catch (Exception e) {
            onlineCoverCache.put(key, NO_COVER);
            return null;
        }
    }

    private MusicTrackVo toTrack(Path root, Path playlistDir, String playlistName, Path file) {
        String fileName = file.getFileName().toString();
        String baseName = stripExtension(fileName);
        ParsedTrack parsed = parseTrack(baseName);
        String url = encodeMusicUrl(root, file);

        return MusicTrackVo.builder()
                .id(playlistName + "/" + fileName)
                .title(parsed.title())
                .artist(parsed.artist())
                .fileName(fileName)
                .url(url)
                .coverUrl(findLocalCoverUrl(root, playlistDir, baseName))
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
            return new ParsedTrack(parts[1].trim(), normalizeArtist(parts[0]));
        }

        int dash = baseName.lastIndexOf('-');
        if (dash > 0 && dash < baseName.length() - 1) {
            return new ParsedTrack(baseName.substring(0, dash).trim(), normalizeArtist(baseName.substring(dash + 1)));
        }
        return new ParsedTrack(baseName.trim(), "Unknown Artist");
    }

    private String normalizeArtist(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (!StringUtils.hasText(value) || "未知作者".equals(value) || "unknown".equalsIgnoreCase(value)) {
            return "Unknown Artist";
        }
        return value;
    }

    private String findLocalCoverUrl(Path root, Path playlistDir, String baseName) {
        try (Stream<Path> files = Files.list(playlistDir)) {
            String lowerBase = baseName.toLowerCase(Locale.ROOT);
            return files
                    .filter(Files::isRegularFile)
                    .filter(this::isImage)
                    .filter(path -> {
                        String name = path.getFileName().toString();
                        String lowerName = stripExtension(name).toLowerCase(Locale.ROOT);
                        return lowerName.equals(lowerBase) || GENERIC_COVER_NAMES.contains(lowerName);
                    })
                    .findFirst()
                    .map(path -> encodeMusicUrl(root, path))
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isImage(Path file) {
        String lower = file.getFileName().toString().toLowerCase(Locale.ROOT);
        return IMAGE_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private String encodeMusicUrl(Path root, Path file) {
        String relative = root.relativize(file).toString().replace('\\', '/');
        String encodedRelative = Stream.of(relative.split("/"))
                .map(segment -> UriUtils.encodePathSegment(segment, StandardCharsets.UTF_8))
                .reduce((a, b) -> a + "/" + b)
                .orElse(file.getFileName().toString());

        String prefix = StringUtils.hasText(appProperties.getMusicUrlPrefix())
                ? appProperties.getMusicUrlPrefix()
                : "/music/";
        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        if (!prefix.endsWith("/")) {
            prefix = prefix + "/";
        }
        return prefix + encodedRelative;
    }

    private record ParsedTrack(String title, String artist) {
    }
}
