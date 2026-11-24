import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Lightweight, zero-dependency in-memory sliding window rate limiter.
    Supports reverse proxies (X-Forwarded-For) and prunes stale entries.
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 300, error_label: str = "requests"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.error_label = error_label
        self.attempts = defaultdict(list)

    def get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first_ip = forwarded.split(",")[0].strip()
            if first_ip:
                return first_ip
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def _prune(self, client_ip: str, now: float):
        cutoff = now - self.window_seconds
        valid = [ts for ts in self.attempts.get(client_ip, []) if ts > cutoff]
        if valid:
            self.attempts[client_ip] = valid
        elif client_ip in self.attempts:
            del self.attempts[client_ip]

    def check_rate_limit(self, request: Request):
        client_ip = self.get_client_ip(request)
        now = time.time()
        self._prune(client_ip, now)

        if len(self.attempts.get(client_ip, [])) >= self.max_requests:
            remaining_seconds = int(self.window_seconds - (now - self.attempts[client_ip][0]))
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many {self.error_label}. Please try again after {remaining_minutes} minute(s)."
            )

    def check_and_record(self, request: Request):
        self.check_rate_limit(request)
        self.record_failed_attempt(request)

    def record_failed_attempt(self, request: Request):
        client_ip = self.get_client_ip(request)
        self.attempts[client_ip].append(time.time())

    def reset_attempts(self, request: Request):
        client_ip = self.get_client_ip(request)
        if client_ip in self.attempts:
            del self.attempts[client_ip]

    def clear_all(self):
        self.attempts.clear()

# Singleton instances
login_limiter = SimpleRateLimiter(max_requests=5, window_seconds=300, error_label="failed login attempts")
register_limiter = SimpleRateLimiter(max_requests=15, window_seconds=3600, error_label="registration attempts")
detection_limiter = SimpleRateLimiter(max_requests=60, window_seconds=60, error_label="detection requests")
