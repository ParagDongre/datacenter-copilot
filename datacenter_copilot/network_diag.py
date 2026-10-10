"""
Network Diagnostics Engine
Safe, read-only network diagnostics with explicit target allowlists and sensible timeouts.
Never scans unauthorized networks or executes destructive commands.
Strict input sanitization to prevent command and socket injection.
"""

import re
import socket
import time
import subprocess
from typing import Dict, Any, List

# Explicit target allowlist to prevent arbitrary scanning
ALLOWED_HOSTS = {
    "127.0.0.1", "localhost", "0.0.0.0",
    "8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1",
    "google.com", "github.com", "cloudflare.com"
}

ALLOWED_PORTS = {22, 53, 80, 443, 3000, 8080, 8085, 8888, 8501}

DOMAIN_REGEX = re.compile(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$')


def is_host_allowed(host: str) -> bool:
    """Verifies target is in safe diagnostic allowlist or is loopback."""
    if not host or not isinstance(host, str):
        return False
    host_clean = host.strip().lower()
    if host_clean in ALLOWED_HOSTS:
        return True
    if host_clean.startswith("127.") or host_clean == "::1":
        return True
    return False


def check_dns_resolution(domain: str, timeout: float = 2.5) -> Dict[str, Any]:
    """
    Safely resolves IPv4 address for a domain.
    Measures resolution latency and traps socket.gaierror.
    Enforces strict regex to reject invalid characters or injection attempts.
    """
    if not domain or not isinstance(domain, str):
        return {
            "success": False,
            "domain": "",
            "records": [],
            "latency_ms": 0.0,
            "error": "Domain name cannot be empty",
            "error_code": "INVALID_INPUT"
        }

    domain_clean = domain.strip().lower()
    if len(domain_clean) > 253 or not DOMAIN_REGEX.match(domain_clean):
        return {
            "success": False,
            "domain": domain_clean,
            "records": [],
            "latency_ms": 0.0,
            "error": "Invalid domain name syntax or prohibited characters",
            "error_code": "INVALID_SYNTAX"
        }

    start_time = time.time()
    old_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(max(0.1, min(timeout, 10.0)))
        try:
            records = socket.gethostbyname_ex(domain_clean)[2]
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": True,
                "domain": domain_clean,
                "records": records,
                "latency_ms": latency_ms,
                "error": None,
                "error_code": None
            }
        finally:
            socket.setdefaulttimeout(old_timeout)
    except socket.gaierror as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "domain": domain_clean,
            "records": [],
            "latency_ms": latency_ms,
            "error": f"DNS resolution failed: {e.strerror}",
            "error_code": e.errno or "EAI_NONAME"
        }
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "domain": domain_clean,
            "records": [],
            "latency_ms": latency_ms,
            "error": str(e),
            "error_code": "UNKNOWN"
        }


def check_tcp_port(host: str, port: int, timeout: float = 2.0) -> Dict[str, Any]:
    """
    Tests TCP connectivity to a specific port on an allowed host.
    Handles ECONNREFUSED, ETIMEDOUT, and success.
    Enforces allowlists and numeric bounds.
    """
    if not isinstance(port, int) or port < 1 or port > 65535:
        return {
            "success": False,
            "host": host,
            "port": port,
            "latency_ms": 0.0,
            "error": f"Invalid TCP port '{port}' (must be 1-65535)",
            "error_code": "INVALID_PORT"
        }

    if not is_host_allowed(host):
        return {
            "success": False,
            "host": host,
            "port": port,
            "latency_ms": 0.0,
            "error": f"Target host '{host}' not permitted in diagnostic allowlist (allowed: localhost, 127.0.0.1, 8.8.8.8, 1.1.1.1, google.com, github.com)",
            "error_code": "DISALLOWED_TARGET"
        }

    start_time = time.time()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    actual_timeout = max(0.1, min(timeout, 5.0))
    s.settimeout(actual_timeout)
    try:
        s.connect((host, port))
        latency_ms = round((time.time() - start_time) * 1000, 2)
        s.close()
        return {
            "success": True,
            "host": host,
            "port": port,
            "latency_ms": latency_ms,
            "error": None,
            "error_code": None
        }
    except socket.timeout:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        s.close()
        return {
            "success": False,
            "host": host,
            "port": port,
            "latency_ms": latency_ms,
            "error": f"Connection timed out after {actual_timeout}s",
            "error_code": "ETIMEDOUT"
        }
    except ConnectionRefusedError:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        s.close()
        return {
            "success": False,
            "host": host,
            "port": port,
            "latency_ms": latency_ms,
            "error": "Connection refused (port closed or daemon not listening)",
            "error_code": "ECONNREFUSED"
        }
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        s.close()
        return {
            "success": False,
            "host": host,
            "port": port,
            "latency_ms": latency_ms,
            "error": str(e),
            "error_code": getattr(e, "errno", "GENERIC_ERROR")
        }


def inspect_interfaces() -> List[Dict[str, Any]]:
    """Gathers genuine local network interfaces using metrics module."""
    from datacenter_copilot.metrics import get_network_interfaces
    res = get_network_interfaces()
    return res.get("items", [])


def inspect_routes() -> Dict[str, Any]:
    """Inspects routing table via safe read-only subprocess command with parameter list."""
    try:
        out = subprocess.run(["ip", "route", "show"], capture_output=True, text=True, timeout=2.0)
        if out.returncode == 0 and out.stdout.strip():
            lines = [l.strip() for l in out.stdout.splitlines() if l.strip()]
            default_gateway = "Unknown"
            for line in lines:
                if line.startswith("default via"):
                    parts = line.split()
                    if len(parts) >= 3:
                        default_gateway = parts[2]
                        break
            return {
                "success": True,
                "routes": lines,
                "raw": out.stdout.strip(),
                "default_gateway": default_gateway
            }
        else:
            return {
                "success": False,
                "error": out.stderr.strip() or "ip route returned empty output",
                "routes": [],
                "raw": ""
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to execute route inspection: {str(e)}",
            "routes": [],
            "raw": ""
        }
