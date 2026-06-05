# Redis

Redis stores short-lived verification codes, send cooldowns, failed-attempt counters,
and per-IP rate limits. MySQL remains the source of truth for user data.

## Local start

1. Install Docker Desktop or another Docker-compatible runtime. On this machine,
   `tools/Install-Yaozher-Docker-Desktop.cmd` installs Docker Desktop to
   `E:\Environment\Docker\DockerDesktop` and stores WSL data in
   `E:\Environment\Docker\wsl-data`.
2. Set `YAOZHER_REDIS_PASSWORD` and `YAOZHER_REDISINSIGHT_ENCRYPTION_KEY` in
   `v1/.env.local.properties`.
3. Run `tools/Start-Yaozher-Redis.cmd`.

Redis is bound to `127.0.0.1:6379`, requires a password, and persists data in the
Docker volume `yaozher-redis-data`. The application fails closed for verification
code operations when Redis is unavailable; normal non-verification APIs remain usable.

RedisInsight is started by the same Compose project and is available only from the
local machine at `http://127.0.0.1:5540`. On the first visit, accept RedisInsight's
license in the browser, then run `tools/Start-Yaozher-Redis.cmd` again so the
preconfigured `yaozher-redis` connection can be added. If a manual connection is
needed, use host `redis`, port `6379`, and the local Redis password from
`v1/.env.local.properties`. Its local connection secrets are encrypted with
`YAOZHER_REDISINSIGHT_ENCRYPTION_KEY`.

Lettuce remains the Java Redis client used by Spring Boot; RedisInsight provides the
visual management interface.
