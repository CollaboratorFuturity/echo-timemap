# echo-timemap -- Server Infrastructure

Last updated: 2026-11-09

## Machine

- **Server**: medusa (Debian, SSH alias `medusa-local`), shared with the other Futurity apps
- **Status**: deployment pending

## This App

| Service | Host binding | Container |
|---------|--------------|-----------|
| Frontend | 127.0.0.1:8109 | echo-timemap-frontend |
| Backend | 127.0.0.1:8110 | echo-timemap-backend |
| Database | 5432 (internal only, no host port) | echo-timemap-db |

- **Subdomain**: not assigned yet
- **Tunnel**: medusa's remotely managed Cloudflare tunnel. Routes are set in the Cloudflare dashboard; there is no `/etc/cloudflared/config.yml` on this host.
- **Compose file**: `~/Repositories/echo-timemap/docker-compose.yml`
- **Volumes**: `echo-timemap_pgdata`, `echo-timemap_uploads`

Ports are set in `.env` (`FRONTEND_PORT`, `BACKEND_PORT`) and can be changed there without editing `docker-compose.yml`. Local development uses the `.env.example` defaults, 3000 and 8000. `docker-compose.yml` binds both to `127.0.0.1`, so only processes on the host, such as `cloudflared`, can reach them.

## Notes

The master `SERVER-INFRASTRUCTURE.md` in `_utils` does not cover medusa. Before changing ports, check the live machine with `sudo docker ps -a` and `sudo ss -tlnp`. Ports 8109 and 8110 were free on 2026-11-09.
