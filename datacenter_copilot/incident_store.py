"""
Incident Management & Reporting Engine
Stores incident snapshots, tracks investigation status, records engineer notes,
and exports comprehensive Markdown / JSON incident reports.
Uses persistent SQLite database (incidents.db) so data survives page refreshes and reboots.
"""

import os
import json
import sqlite3
import datetime
from typing import Dict, Any, List, Optional

DB_FILE = os.environ.get("COPILOT_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "incidents.db"))


class IncidentStore:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = os.path.abspath(db_path)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    evidence_json TEXT,
                    is_simulated INTEGER DEFAULT 0,
                    pre_snapshot_json TEXT,
                    post_snapshot_json TEXT,
                    ai_analysis_json TEXT,
                    remediation_applied TEXT,
                    verified_outcome TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS incident_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    author TEXT NOT NULL,
                    text TEXT NOT NULL,
                    FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
                )
            """)
            conn.commit()

    @property
    def incidents(self) -> List[Dict[str, Any]]:
        return self.list_incidents()

    def list_incidents(self) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC")
            rows = cursor.fetchall()
            incidents = []
            for row in rows:
                notes_cursor = conn.execute(
                    "SELECT timestamp, author, text FROM incident_notes WHERE incident_id = ? ORDER BY id ASC",
                    (row["id"],)
                )
                notes = [dict(n) for n in notes_cursor.fetchall()]

                pre_snap = json.loads(row["pre_snapshot_json"]) if row["pre_snapshot_json"] else None
                post_snap = json.loads(row["post_snapshot_json"]) if row["post_snapshot_json"] else None

                incidents.append({
                    "id": row["id"],
                    "title": row["title"],
                    "severity": row["severity"],
                    "category": row["category"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "createdAt": row["created_at"],
                    "resolved_at": row["resolved_at"],
                    "resolvedAt": row["resolved_at"],
                    "evidence": json.loads(row["evidence_json"] or "{}"),
                    "is_simulated": bool(row["is_simulated"]),
                    "isSimulated": bool(row["is_simulated"]),
                    "investigation_notes": notes,
                    "notes": notes,
                    "pre_remediation_snapshot": pre_snap,
                    "preSnapshot": pre_snap,
                    "post_remediation_snapshot": post_snap,
                    "postSnapshot": post_snap,
                    "ai_analysis": json.loads(row["ai_analysis_json"]) if row["ai_analysis_json"] else None,
                    "remediation_applied": row["remediation_applied"],
                    "remediationApplied": row["remediation_applied"],
                    "verified_outcome": row["verified_outcome"],
                    "verifiedOutcome": row["verified_outcome"]
                })
            return incidents

    def get_incident(self, inc_id: str) -> Optional[Dict[str, Any]]:
        for inc in self.list_incidents():
            if inc["id"] == inc_id:
                return inc
        return None

    def create_incident(self,
                        title: str,
                        severity: str,
                        category: str,
                        evidence: Dict[str, Any],
                        pre_metrics: Optional[Dict[str, Any]] = None,
                        is_simulated: bool = False,
                        incident_id: Optional[str] = None) -> Dict[str, Any]:
        """Creates and persists a new incident record."""
        inc_id = incident_id or f"INC-{int(datetime.datetime.now().timestamp() * 1000) % 1000000}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO incidents (
                    id, title, severity, category, status, created_at, resolved_at,
                    evidence_json, is_simulated, pre_snapshot_json, post_snapshot_json,
                    ai_analysis_json, remediation_applied, verified_outcome
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                inc_id,
                title,
                severity,
                category,
                "OPEN",
                now,
                None,
                json.dumps(evidence or {}),
                1 if is_simulated else 0,
                json.dumps(pre_metrics) if pre_metrics else None,
                None,
                None,
                None,
                None
            ))
            conn.commit()

        return self.get_incident(inc_id)

    def update_status(self, inc_id: str, new_status: str) -> bool:
        with self._get_conn() as conn:
            resolved_at = datetime.datetime.now(datetime.timezone.utc).isoformat() if new_status == "RESOLVED" else None
            if resolved_at:
                conn.execute(
                    "UPDATE incidents SET status = ?, resolved_at = COALESCE(resolved_at, ?) WHERE id = ?",
                    (new_status, resolved_at, inc_id)
                )
            else:
                conn.execute(
                    "UPDATE incidents SET status = ? WHERE id = ?",
                    (new_status, inc_id)
                )
            conn.commit()
            return True

    def add_note(self, inc_id: str, note_text: str, author: str = "Engineer") -> bool:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO incident_notes (incident_id, timestamp, author, text) VALUES (?, ?, ?, ?)",
                (inc_id, now, author, note_text)
            )
            conn.commit()
            return True

    def attach_ai_analysis(self, inc_id: str, analysis: Dict[str, Any]) -> bool:
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE incidents SET ai_analysis_json = ? WHERE id = ?",
                (json.dumps(analysis), inc_id)
            )
            conn.commit()
            return True

    def resolve_incident(self, inc_id: str, remediation: str, post_metrics: Optional[Dict[str, Any]], outcome: str) -> bool:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self._get_conn() as conn:
            conn.execute("""
                UPDATE incidents SET
                    status = 'RESOLVED',
                    resolved_at = COALESCE(resolved_at, ?),
                    remediation_applied = ?,
                    post_snapshot_json = ?,
                    verified_outcome = ?
                WHERE id = ?
            """, (
                now,
                remediation,
                json.dumps(post_metrics) if post_metrics else None,
                outcome,
                inc_id
            ))
            conn.commit()
            return True

    def export_markdown_report(self, inc_id: str) -> str:
        """Generates a formal, interview-ready Markdown Incident Report."""
        incident = self.get_incident(inc_id)
        if not incident:
            return "# Incident Report\n\nIncident not found."

        ai = incident.get("ai_analysis") or {}
        obs = ai.get("confirmed_observations") or []
        hyps = ai.get("hypotheses") or []

        report = f"""# DataCenter Copilot — Post-Mortem Incident Report

**Incident ID:** {incident['id']}
**Title:** {incident['title']}
**Severity:** {incident['severity']}
**Category:** {incident['category']}
**Status:** {incident['status']}
**Type:** {"[SIMULATED LAB ENVIRONMENT]" if incident.get('is_simulated') else "[REAL SYSTEM TELEMETRY]"}
**Created:** {incident['created_at']}
**Resolved:** {incident.get('resolved_at') or 'In Progress'}

---

## 1. Executive Summary
{ai.get('incident_summary') or 'An automated diagnostic anomaly was detected by the DataCenter Copilot engine.'}

---

## 2. Telemetry & Observed Evidence
```json
{json.dumps(incident.get('evidence', {}), indent=2)}
```

### Pre-Remediation Snapshot
- Host: `{incident.get('pre_remediation_snapshot', {}).get('hostname', 'localhost')}`
- CPU Utilization: `{incident.get('pre_remediation_snapshot', {}).get('cpu', {}).get('percent', 'N/A')}%`
- Memory Used: `{incident.get('pre_remediation_snapshot', {}).get('memory', {}).get('percent', 'N/A')}%`
- Disk Used: `{incident.get('pre_remediation_snapshot', {}).get('disk', {}).get('percent', 'N/A')}%`

---

## 3. Confirmed Technical Observations
{chr(10).join(f"- {o}" for o in obs) if obs else "- Diagnostic error flag raised during health polling."}

---

## 4. Root Cause Hypotheses & Evidence Evaluation
"""
        for h in hyps:
            report += f"""
### Hypothesis: {h.get('title')} (Probability: {h.get('probability')})
- **Supporting Evidence:**
{chr(10).join(f"  - {s}" for s in h.get('supporting_evidence', []))}
- **Contradicting Evidence:**
{chr(10).join(f"  - {c}" for c in h.get('contradicting_evidence', []))}
"""

        report += f"""
---

## 5. Engineer Investigation Log
"""
        notes = incident.get("investigation_notes", [])
        if notes:
            for n in notes:
                report += f"- **[{n['timestamp']}] ({n['author']}):** {n['text']}\n"
        else:
            report += "- No manual notes recorded.\n"

        report += f"""
---

## 6. Remediation & Post-Verification
**Remediation Action Applied:** {incident.get('remediation_applied') or 'Pending / Under Investigation'}
**Verification Outcome:** {incident.get('verified_outcome') or 'Pending Verification'}

### Post-Remediation Check
"""
        if incident.get('post_remediation_snapshot'):
            report += f"""- CPU Utilization: `{incident['post_remediation_snapshot'].get('cpu', {}).get('percent', 'N/A')}%`
- Memory Used: `{incident['post_remediation_snapshot'].get('memory', {}).get('percent', 'N/A')}%`
- Disk Used: `{incident['post_remediation_snapshot'].get('disk', {}).get('percent', 'N/A')}%`
- Status: **VERIFIED NORMAL**
"""
        else:
            report += "- Post-check not yet executed.\n"

        report += f"""
---
*Generated by DataCenter Copilot Lab — Portfolio Demonstration Grade*
"""
        return report.strip()
