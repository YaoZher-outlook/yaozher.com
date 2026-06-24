package com.yaozher.v1.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;

@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
@RequiredArgsConstructor
public class ResourceDownloadThrottleFilter extends OncePerRequestFilter {

    private static final String[] DOWNLOAD_PREFIXES = {"/resources/", "/project-files/"};
    private static final long NANOS_PER_SECOND = 1_000_000_000L;
    private static final long MAX_SLEEP_NANOS = 100_000_000L;

    private final AppProperties appProperties;
    private final ConcurrentHashMap<String, AtomicInteger> activeDownloads = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        AppProperties.ResourceDownload config = config();
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return true;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (StringUtils.hasText(contextPath) && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        for (String prefix : DOWNLOAD_PREFIXES) {
            if (path.startsWith(prefix)) {
                return false;
            }
        }
        return true;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        AppProperties.ResourceDownload config = config();
        String clientKey = clientKey(request);
        AtomicInteger counter = activeDownloads.computeIfAbsent(clientKey, ignored -> new AtomicInteger());
        int current = counter.incrementAndGet();

        try {
            int maxConcurrent = Math.max(1, nullToDefault(config.getMaxConcurrentPerClient(), 2));
            if (current > maxConcurrent) {
                response.setStatus(429);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"code\":42900,\"message\":\"Too many concurrent downloads\",\"data\":null}");
                return;
            }

            filterChain.doFilter(request, new ThrottledResponseWrapper(response, nullToDefault(config.getBytesPerSecond(), 0L)));
        } finally {
            if (counter.decrementAndGet() <= 0) {
                activeDownloads.remove(clientKey, counter);
            }
        }
    }

    private AppProperties.ResourceDownload config() {
        AppProperties.Bandwidth bandwidth = appProperties.getBandwidth();
        if (bandwidth == null || bandwidth.getResourceDownload() == null) {
            return new AppProperties.ResourceDownload();
        }
        return bandwidth.getResourceDownload();
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            int comma = forwarded.indexOf(',');
            String first = comma > -1 ? forwarded.substring(0, comma).trim() : forwarded.trim();
            if (StringUtils.hasText(first)) {
                return first;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private int nullToDefault(Integer value, int defaultValue) {
        return value == null ? defaultValue : value;
    }

    private long nullToDefault(Long value, long defaultValue) {
        return value == null ? defaultValue : value;
    }

    private static class ThrottledResponseWrapper extends HttpServletResponseWrapper {
        private final long bytesPerSecond;
        private ServletOutputStream outputStream;
        private PrintWriter writer;

        ThrottledResponseWrapper(HttpServletResponse response, long bytesPerSecond) {
            super(response);
            this.bytesPerSecond = bytesPerSecond;
        }

        @Override
        public ServletOutputStream getOutputStream() throws IOException {
            if (writer != null) {
                throw new IllegalStateException("getWriter() has already been called");
            }
            if (outputStream == null) {
                outputStream = new ThrottledServletOutputStream(super.getOutputStream(), bytesPerSecond);
            }
            return outputStream;
        }

        @Override
        public PrintWriter getWriter() throws IOException {
            if (writer != null) {
                return writer;
            }
            if (outputStream != null) {
                throw new IllegalStateException("getOutputStream() has already been called");
            }
            Charset charset = charset();
            writer = new PrintWriter(new OutputStreamWriter(getOutputStream(), charset));
            return writer;
        }

        private Charset charset() {
            String encoding = getCharacterEncoding();
            if (!StringUtils.hasText(encoding)) {
                return StandardCharsets.UTF_8;
            }
            return Charset.forName(encoding);
        }
    }

    private static class ThrottledServletOutputStream extends ServletOutputStream {
        private final ServletOutputStream delegate;
        private final long bytesPerSecond;
        private final long startNanos = System.nanoTime();
        private long written;

        ThrottledServletOutputStream(ServletOutputStream delegate, long bytesPerSecond) {
            this.delegate = delegate;
            this.bytesPerSecond = bytesPerSecond;
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setWriteListener(WriteListener writeListener) {
            delegate.setWriteListener(writeListener);
        }

        @Override
        public void write(int b) throws IOException {
            delegate.write(b);
            throttle(1);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            delegate.write(b, off, len);
            throttle(len);
        }

        @Override
        public void flush() throws IOException {
            delegate.flush();
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }

        private void throttle(int bytes) {
            if (bytesPerSecond <= 0 || bytes <= 0) {
                return;
            }
            written += bytes;
            long expectedNanos = (written * NANOS_PER_SECOND) / bytesPerSecond;
            long sleepNanos = expectedNanos - (System.nanoTime() - startNanos);
            while (sleepNanos > 1_000_000L) {
                LockSupport.parkNanos(Math.min(sleepNanos, MAX_SLEEP_NANOS));
                sleepNanos = expectedNanos - (System.nanoTime() - startNanos);
            }
        }
    }
}
