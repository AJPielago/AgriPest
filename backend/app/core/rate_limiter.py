import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Lightweight, zero-dependency in-memory sliding window rate limiter for login protection.
    Prevents brute-force attempts without requiring external services like Redis.
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.attempts = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        if request.client and request.client.host:
            return request.client.host
        return "127.0.0.1"

    def check_rate_limit(self, request: Request):
        client_ip = self._get_client_ip(request)
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Clean up timestamps outside current sliding window
        self.attempts[client_ip] = [ts for ts in self.attempts[client_ip] if ts > cutoff]
        
        if len(self.attempts[client_ip]) >= self.max_requests:
            remaining_seconds = int(self.window_seconds - (now - self.attempts[client_ip][0]))
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again after {remaining_minutes} minute(s)."
            )

    def record_failed_attempt(self, request: Request):
        client_ip = self._get_client_ip(request)
        self.attempts[client_ip].append(time.time())

    def reset_attempts(self, request: Request):
        client_ip = self._get_client_ip(request)
        if client_ip in self.attempts:
            del self.attempts[client_ip]

    def clear_all(self):
        self.attempts.clear()

# Singleton instance: Max 5 failed attempts per client IP in 5 minutes (300s)
login_limiter = SimpleRateLimiter(max_requests=5, window_seconds=300)
