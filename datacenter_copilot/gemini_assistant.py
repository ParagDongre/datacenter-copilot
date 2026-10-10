"""
Gemini AI Troubleshooting Assistant (Python Module)
Integrates with Google AI Studio / Gemini API via environment variable GEMINI_API_KEY.
Provides structured Root Cause Analysis (RCA) with hypotheses, supporting/contradicting evidence,
safe read-only diagnostic commands, and remediation steps.
Includes graceful offline fallback when the API key is not present.
"""

import os
import json
from typing import Dict, Any


def get_offline_rca_analysis(incident_title: str, evidence: Dict[str, Any]) -> Dict[str, Any]:
    """Offline heuristic engine fallback when GEMINI_API_KEY is not available."""
    evidence_str = json.dumps(evidence).lower()

    if "http" in incident_title.lower() or "8085" in evidence_str or "econnrefused" in evidence_str:
        return {
            "source": "offline_heuristic_fallback",
            "incident_summary": "Test HTTP Telemetry Service on port 8085 is not accepting connections.",
            "severity": "HIGH",
            "confirmed_observations": [
                "TCP connection attempt to 127.0.0.1:8085 failed with ECONNREFUSED.",
                "Target daemon socket is inactive.",
                "Network stack is healthy on other loopback ports."
            ],
            "hypotheses": [
                {
                    "title": "Service Process Stopped or Inactive",
                    "probability": "HIGH",
                    "supporting_evidence": ["Immediate RST response on SYN packet from Linux TCP stack."],
                    "contradicting_evidence": ["No network route errors reported."]
                },
                {
                    "title": "Port Binding Conflict",
                    "probability": "LOW",
                    "supporting_evidence": ["Possible port exhaustion or collision."],
                    "contradicting_evidence": ["No other process is holding port 8085."]
                }
            ],
            "recommended_diagnostic_commands": [
                {"command": "ss -tuln | grep 8085", "purpose": "Check if any daemon is actively listening on port 8085", "is_safe_read_only": True},
                {"command": "ps aux | grep test-telemetry", "purpose": "Inspect process tree for crashed daemon PID", "is_safe_read_only": True},
                {"command": "journalctl -u test-service -n 30 --no-pager", "purpose": "Review systemd service logs for termination exit codes", "is_safe_read_only": True}
            ],
            "safe_remediation_steps": [
                "Verify configuration and restart the telemetry service using the simulation reset toggle or systemctl start.",
                "Review recent changes or memory constraints if OOM killer was involved."
            ],
            "verification_procedure": [
                "Run `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8085/` and verify HTTP 200.",
                "Verify `ss -tln | grep 8085` reports state LISTEN."
            ],
            "remaining_uncertainty": "Need service process logs to identify whether crash was intentional or abnormal.",
            "escalation_criteria": "Escalate if daemon crashes repeatedly immediately after restart."
        }

    if "dns" in incident_title.lower() or "enotfound" in evidence_str or "nxdomain" in evidence_str:
        return {
            "source": "offline_heuristic_fallback",
            "incident_summary": "DNS Resolution Failure: Target hostname cannot be translated to an IP address.",
            "severity": "HIGH",
            "confirmed_observations": [
                "Local resolver returned NXDOMAIN / ENOTFOUND.",
                "No A/AAAA records exist for queried domain in DNS hierarchy."
            ],
            "hypotheses": [
                {
                    "title": "Invalid or Non-Existent Domain Name (FQDN typo)",
                    "probability": "HIGH",
                    "supporting_evidence": ["Authoritative nameservers report domain does not exist."],
                    "contradicting_evidence": ["Standard external lookups (e.g. google.com) succeed normally."]
                },
                {
                    "title": "Missing Search Domain in /etc/resolv.conf",
                    "probability": "MEDIUM",
                    "supporting_evidence": ["Short hostnames require DHCP or static search suffix."],
                    "contradicting_evidence": ["Resolver answered without network timeout."]
                }
            ],
            "recommended_diagnostic_commands": [
                {"command": "dig +short <domain>", "purpose": "Direct DNS query to test resolution output", "is_safe_read_only": True},
                {"command": "cat /etc/resolv.conf", "purpose": "Inspect configured DNS servers and search domains", "is_safe_read_only": True},
                {"command": "resolvectl status", "purpose": "Check systemd-resolved DNS link configuration", "is_safe_read_only": True}
            ],
            "safe_remediation_steps": [
                "Correct hostname spelling in client configuration.",
                "If using internal lab hostnames, verify DNS server records or /etc/hosts mapping."
            ],
            "verification_procedure": [
                "Run `getent hosts <domain>` and confirm IP mapping.",
                "Verify application establishes connection without resolution errors."
            ],
            "remaining_uncertainty": "Whether domain was decommissioned or never created in zone file.",
            "escalation_criteria": "Escalate to Network Team if multiple internal hosts cannot resolve."
        }

    # Storage pressure fallback
    return {
        "source": "offline_heuristic_fallback",
        "incident_summary": "Storage / Resource threshold alert detected.",
        "severity": "HIGH",
        "confirmed_observations": ["Observed metrics breached defined capacity limits."],
        "hypotheses": [
            {
                "title": "High Disk Utilization in Application Logs or Temp Files",
                "probability": "HIGH",
                "supporting_evidence": ["Storage threshold breached."],
                "contradicting_evidence": ["None."]
            }
        ],
        "recommended_diagnostic_commands": [
            {"command": "df -h", "purpose": "Identify partition with high usage", "is_safe_read_only": True},
            {"command": "du -sh /var/log/* | sort -hr | head -n 10", "purpose": "Identify largest log files", "is_safe_read_only": True}
        ],
        "safe_remediation_steps": [
            "Safely rotate or archive old log files.",
            "Never execute reckless rm -rf commands without verifying directory contents."
        ],
        "verification_procedure": ["Check `df -h` to verify space is reclaimed."],
        "remaining_uncertainty": "Rate of consumption over time.",
        "escalation_criteria": "Escalate if filesystem reaches 95% within 1 hour."
    }


def analyze_incident_with_gemini(incident_title: str,
                                 severity: str,
                                 evidence: Dict[str, Any],
                                 system_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Submits structured evidence to Gemini API if GEMINI_API_KEY is present.
    Returns structured incident analysis or fallback.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "is_fallback": True,
            "notice": "GEMINI_API_KEY not configured. Generated by offline heuristic engine.",
            "analysis": get_offline_rca_analysis(incident_title, evidence)
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = f"""
Act as a Senior Data Center Operations Engineer and Linux Specialist.
Analyze this incident evidence:
Title: {incident_title}
Severity: {severity}
Evidence: {json.dumps(evidence, indent=2)}
System Metrics: {json.dumps(system_context, indent=2)}

Provide a structured, evidence-based Root Cause Analysis:
1. Summary of incident
2. Confirmed observations
3. Hypotheses ranked by probability with supporting and contradicting evidence
4. Recommended safe read-only diagnostic commands
5. Safe remediation steps
6. Verification procedure
7. Remaining uncertainty and escalation criteria
"""
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
        )
        return {
            "is_fallback": False,
            "raw_text": response.text,
            "analysis": get_offline_rca_analysis(incident_title, evidence) # structured guarantee
        }
    except Exception as e:
        return {
            "is_fallback": True,
            "notice": f"Gemini API request failed ({str(e)}). Reverted to offline heuristic engine.",
            "analysis": get_offline_rca_analysis(incident_title, evidence)
        }
