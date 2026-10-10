"""
Incident Detection Engine
Evaluates telemetry against configurable thresholds and creates structured alerts.
Each alert contains severity, evidence, reason, and timestamp.
"""

import datetime
from typing import Dict, Any, List


DEFAULT_THRESHOLDS = {
    "cpu_high_percent": 85.0,
    "mem_high_percent": 90.0,
    "disk_high_percent": 85.0,
}


def evaluate_system_health(metrics: Dict[str, Any],
                           network_results: List[Dict[str, Any]],
                           thresholds: Dict[str, float] = None) -> List[Dict[str, Any]]:
    """
    Evaluates system and network telemetry to identify active incidents.
    Returns a list of structured alert objects.
    """
    if thresholds is None:
        thresholds = DEFAULT_THRESHOLDS

    alerts: List[Dict[str, Any]] = []
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. CPU Check
    cpu_pct = metrics.get("cpu", {}).get("percent", 0.0)
    if cpu_pct > thresholds.get("cpu_high_percent", 85.0):
        alerts.append({
            "id": f"ALERT-CPU-{int(datetime.datetime.now().timestamp())}",
            "severity": "HIGH",
            "category": "COMPUTE",
            "title": "High CPU Utilization Detected",
            "reason": f"Observed CPU usage ({cpu_pct}%) exceeded threshold ({thresholds['cpu_high_percent']}%)",
            "evidence": {
                "metric": "cpu_percent",
                "observed_value": cpu_pct,
                "threshold": thresholds["cpu_high_percent"],
                "load_1m": metrics.get("cpu", {}).get("load_1m", 0.0)
            },
            "timestamp": now,
            "status": "OPEN"
        })

    # 2. Memory Check
    mem_pct = metrics.get("memory", {}).get("percent", 0.0)
    if mem_pct > thresholds.get("mem_high_percent", 90.0):
        alerts.append({
            "id": f"ALERT-MEM-{int(datetime.datetime.now().timestamp())}",
            "severity": "HIGH",
            "category": "MEMORY",
            "title": "High Memory Utilization Detected",
            "reason": f"Observed Memory usage ({mem_pct}%) exceeded threshold ({thresholds['mem_high_percent']}%)",
            "evidence": {
                "metric": "memory_percent",
                "observed_value": mem_pct,
                "threshold": thresholds["mem_high_percent"],
                "used_human": metrics.get("memory", {}).get("used_human", "N/A")
            },
            "timestamp": now,
            "status": "OPEN"
        })

    # 3. Disk Check
    disk_pct = metrics.get("disk", {}).get("percent", 0.0)
    if disk_pct > thresholds.get("disk_high_percent", 85.0):
        alerts.append({
            "id": f"ALERT-DISK-{int(datetime.datetime.now().timestamp())}",
            "severity": "CRITICAL" if disk_pct > 95.0 else "HIGH",
            "category": "STORAGE",
            "title": "Low Available Disk Space on Root Filesystem",
            "reason": f"Root filesystem utilization ({disk_pct}%) exceeded threshold ({thresholds['disk_high_percent']}%)",
            "evidence": {
                "metric": "disk_percent",
                "observed_value": disk_pct,
                "threshold": thresholds["disk_high_percent"],
                "free_human": metrics.get("disk", {}).get("free_human", "N/A"),
                "is_simulated": metrics.get("disk", {}).get("is_simulated", False)
            },
            "timestamp": now,
            "status": "OPEN"
        })

    # 4. Network Diagnostic Results Checks
    for diag in network_results:
        diag_type = diag.get("type")
        if not diag.get("success", False):
            if diag_type == "dns":
                alerts.append({
                    "id": f"ALERT-DNS-{int(datetime.datetime.now().timestamp())}",
                    "severity": "HIGH",
                    "category": "NETWORK_DNS",
                    "title": f"DNS Resolution Failure for {diag.get('target', 'unknown')}",
                    "reason": diag.get("errorMessage") or diag.get("error") or "NXDOMAIN / ENOTFOUND",
                    "evidence": {
                        "target_domain": diag.get("target"),
                        "error_code": diag.get("errorCode") or diag.get("error_code"),
                        "latency_ms": diag.get("latencyMs") or diag.get("latency_ms")
                    },
                    "timestamp": now,
                    "status": "OPEN"
                })
            elif diag_type == "tcp":
                alerts.append({
                    "id": f"ALERT-TCP-{int(datetime.datetime.now().timestamp())}",
                    "severity": "HIGH",
                    "category": "NETWORK_TCP",
                    "title": f"TCP Port {diag.get('port')} Unreachable on {diag.get('target')}",
                    "reason": diag.get("errorMessage") or diag.get("error") or "Connection Refused / Timed Out",
                    "evidence": {
                        "target_host": diag.get("target"),
                        "port": diag.get("port"),
                        "error_code": diag.get("errorCode") or diag.get("error_code")
                    },
                    "timestamp": now,
                    "status": "OPEN"
                })

    return alerts
