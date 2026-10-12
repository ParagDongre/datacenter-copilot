"""
Linux Safe Read-Only Diagnostics Engine for OCI Data Center Technicians
Builds on existing Linux diagnostics with command allowlists, argument-list execution,
bounded timeouts, output limits, and platform-safe error handling.
Never runs arbitrary shell commands or executes destructive operations.
"""

import os
import sys
import subprocess
from typing import Dict, Any, List

# Strict allowlist of safe read-only Linux diagnostic checks
SAFE_COMMAND_ALLOWLIST = {
    "uname": {
        "args": ["uname", "-a"],
        "purpose": "Kernel version, release, architecture, and build time",
        "category": "os_kernel",
        "description": "Inspect OS kernel and system architecture"
    },
    "os_release": {
        "args": ["cat", "/etc/os-release"],
        "purpose": "Operating system distribution name, version ID, and codename",
        "category": "os_kernel",
        "description": "Inspect Linux distribution metadata"
    },
    "uptime": {
        "args": ["uptime"],
        "purpose": "System uptime, active user count, and 1, 5, 15 minute load averages",
        "category": "cpu_memory",
        "description": "Inspect uptime and system load"
    },
    "free": {
        "args": ["free", "-h"],
        "purpose": "Total, used, free, shared, buff/cache, and available RAM and swap",
        "category": "cpu_memory",
        "description": "Inspect memory and swap allocation"
    },
    "ps_top": {
        "args": ["ps", "-eo", "pid,user,pcpu,pmem,stat,start,time,comm", "--sort=-pcpu"],
        "purpose": "Top CPU and memory consuming processes across user and system space",
        "category": "cpu_memory",
        "description": "Top processes sorted by CPU utilization"
    },
    "df": {
        "args": ["df", "-hT"],
        "purpose": "Filesystem mount points, types, capacity, used, and available space",
        "category": "disk_storage",
        "description": "Inspect mounted disk capacities and usage"
    },
    "lsblk": {
        "args": ["lsblk", "-o", "NAME,MAJ:MIN,RM,SIZE,RO,TYPE,MOUNTPOINTS"],
        "purpose": "Block devices, NVMe/SATA drive layout, partition table, and mount targets",
        "category": "disk_storage",
        "description": "Inspect block storage devices and partitions"
    },
    "findmnt": {
        "args": ["findmnt", "-l"],
        "purpose": "Active VFS mount targets, source devices, filesystem types, and mount flags",
        "category": "disk_storage",
        "description": "Inspect virtual filesystem mounts"
    },
    "ip_addr": {
        "args": ["ip", "addr", "show"],
        "purpose": "Network interfaces, IPv4/IPv6 addresses, subnet prefixes, and broadcast flags",
        "category": "network",
        "description": "Inspect network interfaces and IP addresses"
    },
    "ip_link": {
        "args": ["ip", "-s", "link", "show"],
        "purpose": "Link states (UP/DOWN), MAC addresses, MTU, RX/TX bytes, packet drops, and errors",
        "category": "network",
        "description": "Inspect link states and packet drop counters"
    },
    "ip_route": {
        "args": ["ip", "route", "show"],
        "purpose": "Kernel routing table, default gateway, and link-local scope routes",
        "category": "network",
        "description": "Inspect routing tables and default gateway"
    },
    "ss_sockets": {
        "args": ["ss", "-tuln"],
        "purpose": "Active TCP and UDP listening sockets, local ports, and listening interfaces",
        "category": "network",
        "description": "Inspect listening TCP and UDP sockets"
    },
    "ping_gateway": {
        "args": ["ping", "-c", "3", "-W", "1", "127.0.0.1"],
        "purpose": "Bounded ICMP probe testing stack responsiveness with 3 packets",
        "category": "connectivity",
        "description": "Bounded ICMP probe for link responsiveness"
    },
    "journal_errors": {
        "args": ["journalctl", "-p", "3", "-n", "30", "--no-pager"],
        "purpose": "Recent priority 3 (error/critical) system log messages",
        "category": "logs",
        "description": "Inspect recent system errors and warnings"
    },
    "systemctl_services": {
        "args": ["systemctl", "list-units", "--type=service", "--state=running", "--no-pager", "--no-legend"],
        "purpose": "Currently active and running systemd unit services",
        "category": "services",
        "description": "Inspect active systemd services"
    }
}


def run_safe_linux_command(command_key: str) -> Dict[str, Any]:
    """
    Safely executes a single pre-approved, read-only Linux command.
    Uses argument-list subprocess execution (NO shell=True).
    Guarantees strict 3.0s timeout and caps output length to 32KB.
    Distinguishes command failure from command unavailability or permission denial.
    """
    if command_key not in SAFE_COMMAND_ALLOWLIST:
        return {
            "key": command_key,
            "success": False,
            "status": "PROHIBITED",
            "error": f"Command key '{command_key}' is not in the safe diagnostic allowlist.",
            "output": "",
            "args": []
        }

    cmd_spec = SAFE_COMMAND_ALLOWLIST[command_key]
    args = cmd_spec["args"]

    try:
        proc = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=3.0
        )
        raw_out = (proc.stdout or "").strip()
        raw_err = (proc.stderr or "").strip()

        # Truncate if exceeds safe max buffer
        max_len = 32768
        if len(raw_out) > max_len:
            raw_out = raw_out[:max_len] + "\n... [Output truncated for safety]"

        if proc.returncode == 0:
            return {
                "key": command_key,
                "purpose": cmd_spec["purpose"],
                "category": cmd_spec["category"],
                "description": cmd_spec["description"],
                "args": args,
                "commandStr": " ".join(args),
                "success": True,
                "status": "SUCCESS",
                "exitCode": proc.returncode,
                "output": raw_out or "(Command executed successfully with no output)",
                "error": None
            }
        else:
            return {
                "key": command_key,
                "purpose": cmd_spec["purpose"],
                "category": cmd_spec["category"],
                "description": cmd_spec["description"],
                "args": args,
                "commandStr": " ".join(args),
                "success": False,
                "status": "COMMAND_FAILED",
                "exitCode": proc.returncode,
                "output": raw_out,
                "error": raw_err or f"Process exited with non-zero status code {proc.returncode}"
            }
    except FileNotFoundError:
        return {
            "key": command_key,
            "purpose": cmd_spec["purpose"],
            "category": cmd_spec["category"],
            "description": cmd_spec["description"],
            "args": args,
            "commandStr": " ".join(args),
            "success": False,
            "status": "UNAVAILABLE",
            "exitCode": -1,
            "output": "",
            "error": f"Executable '{args[0]}' is not installed or not available in PATH on this host."
        }
    except subprocess.TimeoutExpired:
        return {
            "key": command_key,
            "purpose": cmd_spec["purpose"],
            "category": cmd_spec["category"],
            "description": cmd_spec["description"],
            "args": args,
            "commandStr": " ".join(args),
            "success": False,
            "status": "TIMEOUT",
            "exitCode": -1,
            "output": "",
            "error": "Execution exceeded maximum allowable safety timeout of 3.0 seconds."
        }
    except PermissionError:
        return {
            "key": command_key,
            "purpose": cmd_spec["purpose"],
            "category": cmd_spec["category"],
            "description": cmd_spec["description"],
            "args": args,
            "commandStr": " ".join(args),
            "success": False,
            "status": "PERMISSION_DENIED",
            "exitCode": -1,
            "output": "",
            "error": f"Insufficient permissions to execute '{args[0]}' in current unprivileged container context."
        }
    except Exception as e:
        return {
            "key": command_key,
            "purpose": cmd_spec["purpose"],
            "category": cmd_spec["category"],
            "description": cmd_spec["description"],
            "args": args,
            "commandStr": " ".join(args),
            "success": False,
            "status": "ERROR",
            "exitCode": -1,
            "output": "",
            "error": str(e)
        }


def run_all_safe_linux_commands() -> List[Dict[str, Any]]:
    """Runs all pre-approved read-only Linux diagnostic checks."""
    results = []
    for key in SAFE_COMMAND_ALLOWLIST.keys():
        results.append(run_safe_linux_command(key))
    return results
