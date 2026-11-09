"""Rate limiting with Cloudflare-aware IP resolution.

Uses slowapi (built on limits + redis). The custom key function extracts
the real client IP from Cloudflare Tunnel headers so all requests don't
share a single rate-limit bucket behind the tunnel.

Usage in routers:
    from app.core.rate_limit import limiter

    @router.post("/login")
    @limiter.limit("5/minute")
    async def login(request: Request, ...):
        ...
"""

from fastapi import Request
from slowapi import Limiter


def _client_ip(request: Request) -> str:
    """Extract real client IP, checking Cloudflare headers first."""
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_client_ip, default_limits=[])
