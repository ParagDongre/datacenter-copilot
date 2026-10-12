"""
OCI Data Center Operational Topology & Break-Fix Scenarios Engine
Models:
1. Operations Control Center data: Simulated OCI Site, Racks, PDUs, CRAC cooling, Devices, SLAs, Shifts.
2. Hardware Break-Fix Lab: 11 detailed OCI DCT break-fix scenarios with ordered diagnostics, safe SOP remediation, and verification.
3. Network Troubleshooting Workflows with interactive step-by-step diagnostic sequences.
4. Physical Infrastructure & Rack Inventory: 42U rack elevation layout, power feeds, thermal metrics.
5. Shift Handover & Safety SOPs.
"""

from typing import Dict, Any, List

# 1. OCI Operations Control Center Telemetry
OCI_FACILITY_DATA = {
    "site": {
        "region": "us-ashburn-1",
        "ad": "AD-1 (Availability Domain 1)",
        "facility_code": "IAD-DC-04",
        "building": "Data Center Building 4B",
        "hall": "Data Hall 02 (Row 14 - Row 28)",
        "status": "OPERATIONAL",
        "total_racks": 128,
        "active_servers": 5120,
        "degraded_servers": 14,
        "offline_servers": 3,
        "network_switches": 256,
        "switches_alarm": 2,
    },
    "environmental": {
        "supply_air_temp_c": 21.4,
        "supply_air_status": "NORMAL",
        "return_air_temp_c": 31.8,
        "cold_aisle_humidity_rh": 48.2,
        "crac_units_online": 16,
        "crac_units_total": 18,
        "crac_redundancy": "N+2 (Satisfied)",
        "hot_spots_detected": 1,
        "hot_spot_location": "Rack R18-C (U36-U42 Exhaust: 37.4°C)",
        "pue_current": 1.14,
        "target_pue": 1.15
    },
    "power": {
        "utility_feed_a_kw": 2450.0,
        "utility_feed_b_kw": 2410.0,
        "ups_load_percent_a": 62.4,
        "ups_load_percent_b": 61.8,
        "generator_status": "STANDBY_READY",
        "total_active_load_mw": 4.86,
        "total_facility_capacity_mw": 8.0,
        "redundancy_level": "2N Redundant Feeds Verified",
        "alerts": []
    },
    "slas": [
        {
            "tier": "SEV-1 (Critical Outage)",
            "sla_minutes": 15,
            "target": "Acknowledge within 5m, On-site triage within 15m",
            "active_count": 1,
            "breach_risk": "HIGH"
        },
        {
            "tier": "SEV-2 (High Degradation / Lost Redundancy)",
            "sla_minutes": 60,
            "target": "Acknowledge within 15m, Remediate within 60m",
            "active_count": 3,
            "breach_risk": "MEDIUM"
        },
        {
            "tier": "SEV-3 (Standard Break-Fix / Single PSU)",
            "sla_minutes": 240,
            "target": "Resolution within 4h shift window",
            "active_count": 5,
            "breach_risk": "LOW"
        },
        {
            "tier": "SEV-4 (Planned Maintenance / Provisioning)",
            "sla_minutes": 1440,
            "target": "Next business day / Scheduled maintenance window",
            "active_count": 8,
            "breach_risk": "NONE"
        }
    ],
    "shift_handover": {
        "current_shift": "Day Shift (07:00 - 19:00 UTC)",
        "outgoing_lead": "Marcus Vance (Senior DCT)",
        "incoming_lead": "Elena Rostova (Senior DCT)",
        "handover_timestamp": "2026-10-12T07:00:00Z",
        "pending_critical_tasks": [
            "Rack R18-C U22: Replace suspected faulty PSU-2 before maintenance window closes.",
            "Spine Switch SW-SPINE-02: Link flap on port QSFP28-1/4; optical transceiver inspection scheduled.",
            "CRAC Unit 07: Facilities scheduled dual-filter replacement at 14:00 UTC."
        ],
        "safety_reminders": [
            "Mandatory ESD strap grounding at all server chassis grounding lugs before touching internal FRUs.",
            "Two-person lift required for chassis > 18kg (40 lbs) or 4U storage arrays.",
            "Never bypass PDU circuit breakers; confirm LOTO (Lockout/Tagout) before electrical maintenance."
        ]
    }
}

# 2. Hardware Break-Fix Lab Scenarios
HARDWARE_SCENARIOS = [
    {
        "id": "SCEN-01",
        "title": "Server Fails to Power On (BMC / PDU Fault)",
        "category": "HARDWARE_POWER",
        "severity": "CRITICAL",
        "asset_tag": "SRV-OCI-E4-8492",
        "rack_location": "Rack R14-A, U18-U19",
        "chassis_model": "Oracle OCI BM.Standard.E4 (2U Dual AMD EPYC)",
        "initial_symptoms": "Node unreachable in OCI fleet management; server chassis power LEDs completely dark; front panel power button produces no fan spin or POST code.",
        "observable_evidence": [
            "PDU Branch Breaker B14-03 status: CLOSED (Energized at 208V).",
            "Server PSU-1 LED: Solid Amber (Fault / No AC input detected).",
            "Server PSU-2 LED: Dark (No input power).",
            "BMC / IPMI Out-of-band management port: No link light, ping 10.240.18.42 returns Host Unreachable."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Verify rack PDU receptacle voltage using an insulated digital multimeter / PDU status display.", "finding": "Receptacle A18 reads 208V; Receptacle B18 reads 0V (tripped branch or unseated C13 plug)."},
            {"step": 2, "action": "Inspect power cord seating and strain relief clips on PSU-1 and PSU-2.", "finding": "PSU-2 power cable was dislodged during adjacent cabling activity; PSU-1 cord is seated but PSU-1 fault LED indicates internal failure."},
            {"step": 3, "action": "Connect dedicated crash cart to server rear VGA/DisplayPort and USB.", "finding": "No video signal; power button momentary press yields 0.0W draw on PDU power monitor."},
            {"step": 4, "action": "Reseat PSU-2 power cord into energized PDU bank B.", "finding": "PSU-2 LED illuminates Green. BMC heartbeat LED begins blinking (IPMI booting)."}
        ],
        "confirmed_findings": "Loss of redundant power feed B due to dislodged power cord, concurrent with hardware failure on PSU-1 (internal rectifier fault).",
        "hypotheses": [
            {"title": "Dual PDU power strip outage", "verdict": "RULED_OUT", "reason": "Adjacent servers on same PDU bank A and B remain energized."},
            {"title": "Dead Server Motherboard / Baseboard Management Controller", "verdict": "RULED_OUT", "reason": "BMC booted normally as soon as valid AC power was restored to PSU-2."},
            {"title": "Dual power path interruption (dislodged cord + dead PSU-1)", "verdict": "CONFIRMED", "reason": "Verified through multimeter probe, cable inspection, and PSU LED indicators."}
        ],
        "safe_sop_remediation": [
            "Reseat and lock C13 power cord into PSU-2 with retention clip.",
            "Hot-swap failed PSU-1 module with verified Oracle FRU spare (Part: 7048291).",
            "Verify both PSU-1 and PSU-2 show solid green operational LEDs.",
            "Issue IPMI chassis power on command via OCI Out-of-Band console."
        ],
        "post_verification": [
            "Confirm server completes UEFI POST code sequence to 0x00 without thermal or power error.",
            "Check BMC command: `ipmitool sdr elist | grep -i psu` reports PSU1: OK, PSU2: OK.",
            "Verify server boots into Oracle Linux 8 UEK and accepts SSH connections."
        ],
        "escalation_conditions": "Escalate to Facilities Electrical Team if PDU branch breaker repeatedly trips under rated load.",
        "ticket_resolution_note": "Identified dislodged PSU-2 AC cord in Rack R14-A and failed PSU-1 module. Re-anchored cord with retention clip, hot-swapped PSU-1 FRU (Part: 7048291). Verified dual redundant power, normal BMC telemetry, and clean OS boot."
    },
    {
        "id": "SCEN-02",
        "title": "Server Unreachable Over Network (NIC / Cable Fault)",
        "category": "HARDWARE_NETWORK",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-E3-2041",
        "rack_location": "Rack R16-B, U04-U05",
        "chassis_model": "Oracle OCI Bare Metal Node (2U Dual Xeon Platinum)",
        "initial_symptoms": "Server node dropped out of cluster heartbeat. SSH connection times out. BMC remains accessible via dedicated out-of-band network.",
        "observable_evidence": [
            "BMC web console accessible; OS reported running with normal CPU/RAM load.",
            "Rear Top-of-Rack (TOR) Switch port 1/14 link light: OFF.",
            "Server NIC port 1 (Mellanox ConnectX-5 25GbE SFP28) link LED: AMBER (No Sync).",
            "Linux `ip link show` reports `ens3f0: <NO-CARRIER,BROADCAST,MULTICAST,UP>`."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Connect via BMC Serial-over-LAN (SOL) console to verify host OS kernel state.", "finding": "Host OS is responsive. `dmesg | grep -E 'mlx5|link'` shows link down transitions."},
            {"step": 2, "action": "Inspect physical 25G SFP28 optical transceiver / DAC cable connection at server and TOR switch.", "finding": "Cable strain detected on TOR patch panel; fiber bend radius exceeded standard 30mm specification."},
            {"step": 3, "action": "Query interface transceivers via ethtool: `ethtool -m ens3f0`.", "finding": "Optical RX power reads -38.2 dBm (Signal Lost / Below sensitivity threshold of -14 dBm)."},
            {"step": 4, "action": "Clean fiber LC connector end-face using visual inspection scope and one-click cleaner, then test with known-good fiber patch.", "finding": "RX optical power recovers to -3.8 dBm; link light illuminates solid green."}
        ],
        "confirmed_findings": "Severe fiber micro-bend and dirty LC end-face causing optical signal attenuation below receiver sensitivity threshold on primary 25G uplink.",
        "hypotheses": [
            {"title": "Mellanox NIC PCIe controller hardware failure", "verdict": "RULED_OUT", "reason": "PCIe bus enumeration intact; firmware responds to driver queries."},
            {"title": "TOR switch port disabled by port-security/BPDU guard", "verdict": "RULED_OUT", "reason": "Switch port administrative status is UP; physical PHY layer lacks light."},
            {"title": "Physical optical layer degradation (dirty connector & exceeded bend radius)", "verdict": "CONFIRMED", "reason": "Low optical power (-38.2 dBm) restored to -3.8 dBm upon cleaning and re-patching."}
        ],
        "safe_sop_remediation": [
            "Adhere to Class 1M Laser Safety SOP; never look directly into active fiber cores.",
            "Clean fiber ferrule using 2.5mm dry click cleaner.",
            "Re-route fiber jumper through rack vertical cable organizer with proper slack.",
            "Observe link negotiation to 25000Mb/s Full Duplex."
        ],
        "post_verification": [
            "Verify `ip link show ens3f0` returns `<BROADCAST,MULTICAST,UP,LOWER_UP>`.",
            "Verify ping to default gateway `<1ms` with 0% packet loss.",
            "Check TOR switch port error counters: `show interfaces 1/14 counters errors` shows zero increments."
        ],
        "escalation_conditions": "Escalate to Network Infrastructure Engineering if switch port PHY remains down after transceiver and jumper replacement.",
        "ticket_resolution_note": "Restored network connectivity to SRV-OCI-E3-2041. Re-routed pinched fiber cable, cleaned LC optical connectors, and verified 25G link sync at -3.8 dBm optical power. Cluster node passed post-maintenance health checks."
    },
    {
        "id": "SCEN-03",
        "title": "Failed or Degraded NVMe / SAS Storage Drive",
        "category": "HARDWARE_STORAGE",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-STOR-9104",
        "rack_location": "Rack R19-A, U10-U13",
        "chassis_model": "OCI High-I/O Bare Metal (4U 24x U.2 NVMe SSD)",
        "initial_symptoms": "Storage RAID/ZFS array entered DEGRADED state. Drive slot 07 fault LED flashing Amber. Kernel reporting I/O timeouts.",
        "observable_evidence": [
            "Drive carrier slot 07 LED: Solid Amber.",
            "`dmesg -T | grep -E 'nvme|blk'` reports: `nvme1n1: controller reset failed / I/O timeout`.",
            "`nvme smart-log /dev/nvme1` reports Critical Warning: 0x01 (Available spare below threshold), Media Errors: 4892.",
            "Array management utility reports drive slot 07 FAULTED."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Query NVMe drive telemetry using `nvme list` and vendor diagnostic tool.", "finding": "Drive /dev/nvme1 serial PHCV819002J73P8G unresponsive to write commands."},
            {"step": 2, "action": "Confirm drive slot location using chassis identification LED: `nvme-cli` or `ledctl locate`.", "finding": "Drive bay 07 blue locate LED blinks; amber fault LED confirms affected drive."},
            {"step": 3, "action": "Verify storage array parity redundancy before pulling drive.", "finding": "Array is RAID-Z2 with 1 drive down; parity remains protected for single-drive replacement."},
            {"step": 4, "action": "Execute software offline command before unlatching drive carrier.", "finding": "Drive safely detached from kernel driver."}
        ],
        "confirmed_findings": "Uncorrectable NAND flash media exhaustion and controller lockup on 3.84TB U.2 NVMe SSD in Bay 07.",
        "hypotheses": [
            {"title": "PCIe Backplane Slot Defect", "verdict": "RULED_OUT", "reason": "Drive SMART log recorded media errors accumulated prior to controller timeout."},
            {"title": "NVMe SSD End-of-Life / Media Failure", "verdict": "CONFIRMED", "reason": "Available spare exhausted, high media error count, controller lockup."}
        ],
        "safe_sop_remediation": [
            "Confirm server drive bay labeling matches ticket asset and serial number.",
            "Unlatch drive bay 07 carrier lever, wait 30 seconds for spindle/controller power down.",
            "Slide out defective SSD and install exact OCI replacement FRU (3.84TB NVMe U.2 Enterprise SSD).",
            "Close drive carrier lever and verify green power/activity LED."
        ],
        "post_verification": [
            "Confirm `nvme list` detects new serial number with 100% available spare.",
            "Initiate array rebuild / resilver: check progress shows active rebuild without I/O errors.",
            "Verify chassis front panel fault LED clears to normal."
        ],
        "escalation_conditions": "Escalate immediately if a second drive in the same array enters degraded state during resilvering.",
        "ticket_resolution_note": "Replaced degraded 3.84TB NVMe drive in Bay 07 (SN: PHCV819002J73P8G) with replacement FRU (SN: PHCV829009N21K4L). Resilvering initiated successfully, zero bus errors detected."
    },
    {
        "id": "SCEN-04",
        "title": "Correctable / Uncorrectable Memory (DIMM) Multi-Bit ECC Fault",
        "category": "HARDWARE_MEMORY",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-E4-5519",
        "rack_location": "Rack R15-C, U28-U29",
        "chassis_model": "Oracle OCI BM.Standard.E4 (DDR4-3200 Registered ECC)",
        "initial_symptoms": "Server node experienced unexpected NMI kernel panic. BMC SEL log reports Uncorrectable Multi-bit ECC error on CPU 1 Channel B DIMM 0.",
        "observable_evidence": [
            "BMC System Event Log (SEL): `Memory - Uncorrectable ECC | Assertion | DIMM_CPU1_B0`.",
            "Linux `edac-util -v` reports uncorrectable error count incremented to 1 on mc0 csrow1.",
            "Chassis internal light path diagnostic LED: Amber LED illuminated near DIMM slot CPU1_B0."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Query BMC SEL log via ipmitool: `ipmitool sel elist | grep -i memory`.", "finding": "Event timestamp aligns with server crash; specifically identifies socket 1, channel B, slot 0."},
            {"step": 2, "action": "Schedule server into maintenance mode and drain production workloads via OCI fleet API.", "finding": "Host evacuated; server safe to power down."},
            {"step": 3, "action": "Execute controlled shutdown and verify zero AC power through power off verification.", "finding": "Server powered off; technician attaches grounded ESD wrist strap to chassis frame."},
            {"step": 4, "action": "Slide server out on toolless rack rails, remove top access cover, and inspect light path diagnostics.", "finding": "Amber fault LED confirmed at DIMM slot CPU1_B0; no thermal discoloration or debris."}
        ],
        "confirmed_findings": "Catastrophic DRAM chip failure on DDR4 64GB 3200MHz ECC RDIMM in socket CPU1_B0.",
        "hypotheses": [
            {"title": "CPU Memory Controller defect", "verdict": "RULED_OUT", "reason": "Other channels on CPU1 continue operating normally without bit errors."},
            {"title": "Faulty RDIMM Module", "verdict": "CONFIRMED", "reason": "Corroborated by BMC SEL multi-bit ECC record and motherboard light path LED."}
        ],
        "safe_sop_remediation": [
            "Wear calibrated ESD wrist strap attached to unpainted chassis metal.",
            "Release both retaining clips of DIMM slot CPU1_B0 symmetrically.",
            "Remove defective 64GB RDIMM and seat certified replacement FRU until retaining clips click firmly shut.",
            "Replace top cover, slide chassis back into rack, and power on."
        ],
        "post_verification": [
            "Run memtester / UEFI diagnostic memory sweep across all channels.",
            "Verify `free -h` and `lshw -C memory` show full 1024GB RAM available.",
            "Clear BMC SEL log and confirm zero new ECC assertions."
        ],
        "escalation_conditions": "Escalate to Level 3 Hardware Engineering if replacement DIMM in same slot immediately triggers ECC errors.",
        "ticket_resolution_note": "Replaced defective 64GB DDR4 ECC RDIMM in slot CPU1_B0 following SEL uncorrectable ECC alert. Completed memory POST verification, full 1TB RAM recognized, zero ECC increments."
    },
    {
        "id": "SCEN-05",
        "title": "CPU Overheating & Thermal Throttling",
        "category": "HARDWARE_THERMAL",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-E3-1108",
        "rack_location": "Rack R18-C, U38-U39",
        "chassis_model": "Oracle OCI 2U Compute Node",
        "initial_symptoms": "Server CPU core clocks throttled down to 800MHz. User complaints of degraded computing throughput. BMC fan speed at 100% (18,000 RPM).",
        "observable_evidence": [
            "Linux `sensors` / `ipmitool sdr elist | grep -i temp` reports CPU1 Temp: 98.5°C (Critical Threshold: 95.0°C).",
            "`dmesg -T | grep -i throttle` reports: `CPU1: Core temperature above threshold, cpu clock throttled`.",
            "Adjacent CPU0 Temp: 48.2°C (Healthy). Delta between socket 0 and socket 1 is >50°C."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Check system fan telemetry: `ipmitool sdr type fan`.", "finding": "All 6 chassis fan modules operating at max RPM (>17,500 RPM); air intake temp is normal (22°C)."},
            {"step": 2, "action": "Power down server, open chassis cover, and inspect CPU1 heatsink seating and airflow baffle.", "finding": "Air baffle was improperly seated after prior cable repair, partially starving CPU1 heatsink of laminar airflow; heatsink retention bracket has loose diagonal torx screw."}
        ],
        "confirmed_findings": "Uneven thermal interface pressure due to loose heatsink retention screw combined with misaligned airflow shroud.",
        "hypotheses": [
            {"title": "Facility Cold Aisle Cooling Failure", "verdict": "RULED_OUT", "reason": "Rack inlet temp is 21.8°C; CPU0 on same motherboard operates at 48.2°C."},
            {"title": "Chassis Fan Failure", "verdict": "RULED_OUT", "reason": "All 6 fan modules tachometer readings verified >17,500 RPM."},
            {"title": "Heatsink Mounting / Airflow Baffle Disruption", "verdict": "CONFIRMED", "reason": "Verified loose heatsink retention torx screw and displaced airflow baffle."}
        ],
        "safe_sop_remediation": [
            "Remove CPU1 heatsink, clean old thermal paste using lint-free wipe and 99% isopropyl alcohol.",
            "Apply fresh thermal interface material (TIM) using approved stencil / pea-sized method.",
            "Torque heatsink retention screws in diagonal cross-pattern using calibrated T20 torque driver (12 in-lbs).",
            "Re-install and align translucent airflow baffle properly."
        ],
        "post_verification": [
            "Power on server and monitor CPU temperatures under synthetic 100% CPU stress test (`stress-ng`).",
            "Confirm CPU1 temperature stabilizes at 64.0°C with fan speed settling to normal 8,500 RPM.",
            "Verify `dmesg` reports no thermal throttling events."
        ],
        "escalation_conditions": "Escalate if CPU core temperatures remain >90°C despite heatsink repaste and proper torque.",
        "ticket_resolution_note": "Remediated CPU1 thermal throttling on SRV-OCI-E3-1108. Cleaned and reapplied thermal grease, torqued heatsink to spec, and reseated airflow baffle. Full load temperatures stabilized at 64°C."
    },
    {
        "id": "SCEN-06",
        "title": "Chassis Cooling Fan Failure & Abnormal RPM",
        "category": "HARDWARE_COOLING",
        "severity": "MEDIUM",
        "asset_tag": "SRV-OCI-E4-7721",
        "rack_location": "Rack R17-B, U12-U13",
        "chassis_model": "Oracle OCI 2U Standard Chassis",
        "initial_symptoms": "BMC generates critical sensor threshold alert: Fan 4 Tachometer reports 0 RPM. Remaining fans running at elevated acoustical speed.",
        "observable_evidence": [
            "BMC SEL: `Fan 4 - Lower Non-Recoverable | Reading 0 RPM | Threshold 1200 RPM`.",
            "Front panel health status LED blinking Amber.",
            "`ipmitool sdr elist | grep -i fan` shows FAN_MOD_4: 0 RPM [CRITICAL]."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Inspect chassis hot-swap fan bay 4 LED indicator.", "finding": "Fan Module 4 status LED is Amber; rotor is stationary."},
            {"step": 2, "action": "Verify no internal cabling has snagged or fouled the fan blades.", "finding": "Visual inspection reveals clear path; fan bearings seized."}
        ],
        "confirmed_findings": "Mechanical bearing seizure on dual-rotor fan module 4.",
        "hypotheses": [
            {"title": "Mainboard fan header tachometer sensor circuit failure", "verdict": "RULED_OUT", "reason": "Fan rotor was physically stationary and warm to the touch."},
            {"title": "Dual-rotor fan module mechanical failure", "verdict": "CONFIRMED", "reason": "Bearing failure confirmed upon removal."}
        ],
        "safe_sop_remediation": [
            "Pinch release latches on hot-swap Fan Module 4 and pull vertically from fan cage.",
            "Insert verified spare dual-rotor fan module (FRU: 7048312) firmly until latch clicks.",
            "Observe LED transition from Amber to solid Green."
        ],
        "post_verification": [
            "Check `ipmitool sdr elist | grep -i fan` reports FAN_MOD_4: 9,200 RPM [OK].",
            "Confirm remaining chassis fans reduce speed from emergency acoustic profile back to baseline 8,500 RPM.",
            "Front panel status LED returns to solid Green."
        ],
        "escalation_conditions": "Escalate to facilities if multiple fan modules fail across adjacent racks simultaneously.",
        "ticket_resolution_note": "Hot-swapped defective fan module 4 on SRV-OCI-E4-7721. Verified normal RPM, cleared BMC SEL threshold alert, chassis acoustics restored to nominal."
    },
    {
        "id": "SCEN-07",
        "title": "Redundant Power Supply Unit (PSU) Alert & Loss of Redundancy",
        "category": "HARDWARE_POWER",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-E4-9012",
        "rack_location": "Rack R18-C, U22-U23",
        "chassis_model": "Oracle OCI 2U Dual PSU Node",
        "initial_symptoms": "Datacenter Operations ticket SEV-2: Node lost power redundancy. Operating on single power feed A. Risk of immediate shutdown if PDU A experiences an event.",
        "observable_evidence": [
            "PDU B Feed monitor normal, but Server PSU-2 shows blinking Amber LED.",
            "BMC SDR: `PSU2_Status - Presence Detected, Input Lost or Output Disabled`.",
            "PDU Receptacle B22 verified energized at 208V."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Inspect PSU-2 status LED and error code via BMC.", "finding": "PSU-2 internal fan is running, but DC output rail voltage is 0.0V (crowbar protection or blown fuse)."},
            {"step": 2, "action": "Confirm server power redundancy policy is set to 1+1 Redundant.", "finding": "Server currently operating on PSU-1 at 420W total draw."}
        ],
        "confirmed_findings": "Internal secondary stage rectifier failure on PSU-2; node operating in non-redundant state.",
        "hypotheses": [
            {"title": "PDU branch breaker trip", "verdict": "RULED_OUT", "reason": "PDU B meter shows 208V and adjacent equipment is energized."},
            {"title": "PSU-2 internal hardware component failure", "verdict": "CONFIRMED", "reason": "Valid AC input present, zero DC output."}
        ],
        "safe_sop_remediation": [
            "Depress PSU-2 retention clip, disengage power cord, slide defective PSU out of chassis bay.",
            "Slide certified replacement 1600W Platinum PSU into bay until locking tab snaps securely.",
            "Reconnect AC cord with retention bail.",
            "Verify PSU-2 LED transitions to solid Green."
        ],
        "post_verification": [
            "`ipmitool sdr elist | grep -i psu` reports PSU1: OK, PSU2: OK.",
            "Confirm load-sharing telemetry: PSU-1 draws 215W, PSU-2 draws 210W.",
            "Resolve SEV-2 loss of redundancy ticket."
        ],
        "escalation_conditions": "Escalate to Facilities Electrical if replacement PSU immediately sparks or trips PDU breaker.",
        "ticket_resolution_note": "Hot-swapped defective PSU-2 in Rack R18-C U22. Verified balanced load sharing across redundant PDU A and B feeds. Cleared operational alarm."
    },
    {
        "id": "SCEN-08",
        "title": "Network Interface Down (PHY Link Down)",
        "category": "HARDWARE_NETWORK",
        "severity": "HIGH",
        "asset_tag": "SRV-OCI-NET-3310",
        "rack_location": "Rack R15-A, U14-U15",
        "chassis_model": "Oracle OCI Network Gateway Node",
        "initial_symptoms": "Secondary 100GbE uplink interface `ens1f1` transitioned to DOWN state. BGP peering session dropped.",
        "observable_evidence": [
            "`ip link show ens1f1` reports `state DOWN`.",
            "`ethtool ens1f1` reports `Speed: Unknown!`, `Duplex: Unknown!`, `Link detected: no`.",
            "Rear QSFP28 port status LED is OFF."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Check administrative link state: `ip link set ens1f1 up`.", "finding": "State remains `NO-CARRIER` (physical layer disconnected)."},
            {"step": 2, "action": "Query transceiver EEPROM: `ethtool -m ens1f1`.", "finding": "Returns I/O error reading transceiver EEPROM (optical module not responding on I2C bus)."},
            {"step": 3, "action": "Reseat QSFP28 100G transceiver in PCIe NIC port 1.", "finding": "Transceiver latch was loose and had backed out 2mm from cage."}
        ],
        "confirmed_findings": "Unseated 100G optical transceiver module lacking physical contact with PCIe NIC cage pins.",
        "hypotheses": [
            {"title": "Host kernel NIC driver crash", "verdict": "RULED_OUT", "reason": "Interface ens1f0 on same ASIC operates normally."},
            {"title": "Unseated QSFP28 optical transceiver", "verdict": "CONFIRMED", "reason": "Transceiver had disengaged from internal cage connector."}
        ],
        "safe_sop_remediation": [
            "Carefully disengage QSFP28 pull tab, inspect transceiver gold fingers for physical damage.",
            "Firmly push transceiver into port cage until positive click is heard and felt.",
            "Reconnect MPO/LC fiber jumper."
        ],
        "post_verification": [
            "`ethtool ens1f1` reports `Speed: 100000Mb/s`, `Duplex: Full`, `Link detected: yes`.",
            "Verify BGP session re-establishes within 45 seconds.",
            "Ping gateway across `ens1f1` with zero packet loss."
        ],
        "escalation_conditions": "Escalate to Network Operations if link flaps continuously upon reseating.",
        "ticket_resolution_note": "Reseated 100G QSFP28 transceiver on interface ens1f1. Link synchronized at 100Gbps, BGP session restored."
    },
    {
        "id": "SCEN-09",
        "title": "Link Errors, Packet Drops & Intermittent CRC Errors",
        "category": "HARDWARE_NETWORK",
        "severity": "MEDIUM",
        "asset_tag": "SRV-OCI-DB-4019",
        "rack_location": "Rack R14-B, U30-U31",
        "chassis_model": "Oracle OCI Database Node",
        "initial_symptoms": "High TCP retransmissions, intermittent application latency spikes, and degraded database replication throughput.",
        "observable_evidence": [
            "`ip -s link show ens2f0` reports thousands of `rx errors` and `rx frame crc errors`.",
            "`ethtool -S ens2f0 | grep -E 'crc|drop|error'` shows `rx_crc_errors: 184920` rapidly incrementing.",
            "TOR switch port counters confirm matching FCS (Frame Check Sequence) error rate."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Inspect physical optical power levels: `ethtool -m ens2f0`.", "finding": "Optical RX power fluctuates erratically between -18.0 dBm and -24.0 dBm (normal is -4.0 to -8.0 dBm)."},
            {"step": 2, "action": "Inspect fiber patch cord along vertical cable arm.", "finding": "Cable zip-tie was overtightened, pinching the fiber jacket against sharp rack rail edge."}
        ],
        "confirmed_findings": "High optical dispersion and micro-bends caused by excessively cinched cable ties, resulting in FCS CRC bit errors.",
        "hypotheses": [
            {"title": "Host TCP stack buffer overflow", "verdict": "RULED_OUT", "reason": "Errors are physical layer FCS CRC errors, not kernel buffer drops."},
            {"title": "Crushed fiber cable from overtightened zip-tie", "verdict": "CONFIRMED", "reason": "Removing zip-tie and replacing pinched patch cord completely stopped CRC increments."}
        ],
        "safe_sop_remediation": [
            "Cut overtightened zip-tie immediately using flush-cut pliers (never box cutters near optical cables).",
            "Replace compromised duplex LC fiber patch cord with new tested OM4 patch jumper.",
            "Secure fiber using reusable Velcro cable wraps exclusively (no nylon zip-ties per OCI DC SOP)."
        ],
        "post_verification": [
            "Monitor `ethtool -S ens2f0 | grep crc` for 5 minutes during network load test.",
            "Verify CRC error counter ceases incrementing (delta = 0).",
            "Verify stable RX power at -5.2 dBm."
        ],
        "escalation_conditions": "Escalate if switch port ASIC PHY reports internal MAC serializer errors.",
        "ticket_resolution_note": "Replaced pinched LC fiber jumper in Rack R14-B. Replaced hard zip-ties with Velcro straps. CRC errors ceased; replication latency normalized."
    },
    {
        "id": "SCEN-10",
        "title": "Suspected Faulty Transceiver / Patch Cable on Spine Link",
        "category": "HARDWARE_NETWORK",
        "severity": "HIGH",
        "asset_tag": "SW-OCI-SPINE-02",
        "rack_location": "Rack R16-D, U41-U42",
        "chassis_model": "Oracle OCI 400G Spine Switch",
        "initial_symptoms": "Spine-to-Leaf link flapping every 30-90 seconds. OSPF/BGP neighbor states transitioning between FULL and DOWN.",
        "observable_evidence": [
            "Switch syslog: `PORT_LINK_STATUS: Interface Ethernet1/4 changed state to down / changed state to up`.",
            "Optical diagnostics report Lane 2 TX bias current at 95mA (Far exceeding 65mA maximum normal limit).",
            "Module internal temperature reads 78.4°C (thermal shutdown threshold 80°C)."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Query transceiver DOM telemetry on switch console.", "finding": "Lane 2 laser diode degrading; excessive bias current and overheating indicate dying transmitter laser."},
            {"step": 2, "action": "Administratively shutdown port to prevent ECMP routing packet loss during technician replacement.", "finding": "Traffic safely diverted across redundant spine links."}
        ],
        "confirmed_findings": "Optical transmitter laser diode degradation and thermal runaway in 400G QSFP-DD optical module.",
        "hypotheses": [
            {"title": "Switch ASIC forwarding queue congestion", "verdict": "RULED_OUT", "reason": "Telemetry pinpoints physical layer laser bias current anomaly."},
            {"title": "Failing QSFP-DD Transceiver Module", "verdict": "CONFIRMED", "reason": "Telemetry shows laser diode bias current exceeded manufacturer specification."}
        ],
        "safe_sop_remediation": [
            "Unplug MPO-16 fiber trunk cable and apply dust caps immediately to cable and transceiver.",
            "Extract degraded 400G-DR4 QSFP-DD transceiver from switch port 1/4.",
            "Insert verified spare 400G-DR4 transceiver; clean MPO fiber connector end-face.",
            "Administratively re-enable switch port: `no shutdown`."
        ],
        "post_verification": [
            "Confirm all 4 lanes show stable TX bias (45-52mA) and normal temperatures (44°C).",
            "Verify link status solid UP with zero flapping over 15-minute observation window.",
            "Confirm BGP sessions re-established and passing ECMP traffic."
        ],
        "escalation_conditions": "Escalate to Backbone Network Engineering if replacement module fails to initialize in switch cage.",
        "ticket_resolution_note": "Replaced failing 400G QSFP-DD transceiver on SW-OCI-SPINE-02 Eth1/4. Cleared laser bias current alarm, verified zero link flaps over 15 minutes."
    },
    {
        "id": "SCEN-11",
        "title": "Failed Server Health Check After Scheduled Maintenance",
        "category": "POST_MAINTENANCE",
        "severity": "MEDIUM",
        "asset_tag": "SRV-OCI-E4-3091",
        "rack_location": "Rack R17-A, U06-U07",
        "chassis_model": "Oracle OCI BM.Standard.E4",
        "initial_symptoms": "Server completed scheduled motherboard replacement, but automated OCI post-maintenance validation suite failed with: 'Host MAC Mismatch / BMC Firmware Out of Date'.",
        "observable_evidence": [
            "Automated provisioning script exit code 12: `VALIDATION_FAILED: Expected BMC v3.18, Found v2.10`.",
            "Host FRU inventory indicates replacement system board has unprogrammed Asset Tag and Chassis Serial Number.",
            "Security certificate rejected by cluster control plane."
        ],
        "diagnostic_steps": [
            {"step": 1, "action": "Log into BMC maintenance console via serial crash cart.", "finding": "Motherboard came from spare parts depot with factory base firmware and blank FRU EEPROM."},
            {"step": 2, "action": "Execute BMC firmware update to approved OCI gold image version.", "finding": "BMC successfully flashed to v3.18.04-oracle."}
        ],
        "confirmed_findings": "Unprogrammed FRU EEPROM and unpatched baseline firmware on replacement field service motherboard.",
        "hypotheses": [
            {"title": "Defective replacement motherboard", "verdict": "RULED_OUT", "reason": "Hardware functions correctly; discrepancy is purely firmware and asset metadata configuration."},
            {"title": "Incomplete post-replacement commissioning procedure", "verdict": "CONFIRMED", "reason": "Motherboard replacement requires running Oracle FRU programming utility and firmware leveling."}
        ],
        "safe_sop_remediation": [
            "Execute OCI FRU programming utility: write asset tag `SRV-OCI-E4-3091` and chassis serial number to baseboard EEPROM.",
            "Apply approved UEFI and BMC firmware update bundle.",
            "Reboot system and trigger automated hardware validation workflow."
        ],
        "post_verification": [
            "All 24 automated health check tests return PASS (Memory, CPU, NVMe, NIC, BMC, TPM 2.0).",
            "OCI Fleet provisioning system marks server status as AVAILABLE_IN_POOL.",
            "Sign off maintenance ticket."
        ],
        "escalation_conditions": "Escalate to Systems Engineering if TPM 2.0 cryptographic endorsement key fails attestation.",
        "ticket_resolution_note": "Completed post-maintenance commissioning on SRV-OCI-E4-3091. Programmed FRU EEPROM, flashed BMC to v3.18 gold baseline, and passed 100% of fleet validation tests."
    }
]

# 3. Interactive Network Troubleshooting Scenarios
NETWORK_TROUBLESHOOTING_WORKFLOWS = [
    {
        "id": "NET-FLOW-01",
        "title": "Layer 1/2: Link Down & Physical Connectivity",
        "description": "Step-by-step diagnostic workflow for identifying physical cabling, transceiver, and port issues",
        "steps": [
            {"step": 1, "command": "ip link show", "expected": "Interface state UP with <LOWER_UP> carrier flag", "if_failed": "Inspect physical transceiver and cable if state is NO-CARRIER or DOWN."},
            {"step": 2, "command": "ethtool <interface>", "expected": "Speed: 10000Mb/s or higher, Duplex: Full, Link detected: yes", "if_failed": "Auto-negotiation mismatch or unseated transceiver."},
            {"step": 3, "command": "ethtool -m <interface>", "expected": "Optical RX/TX power levels between -2.0 dBm and -12.0 dBm", "if_failed": "Clean optical connectors; check fiber bend radius."},
            {"step": 4, "command": "ethtool -S <interface> | grep -E 'drop|err|crc'", "expected": "Error counters stable at 0 increments", "if_failed": "Replace patch jumper; clean fiber ferrule; inspect switch port."}
        ]
    },
    {
        "id": "NET-FLOW-02",
        "title": "Layer 3: IP Addressing, Gateway & Subnet Routing",
        "description": "Step-by-step diagnostic workflow for IP assignment, subnet masking, and default routing",
        "steps": [
            {"step": 1, "command": "ip addr show dev <interface>", "expected": "Valid IPv4 address with appropriate subnet prefix (e.g. /24)", "if_failed": "Check DHCP lease or static IP network configuration."},
            {"step": 2, "command": "ip route show", "expected": "Default route exists: `default via <gateway_ip> dev <interface>`", "if_failed": "Missing default gateway in netplan / network-scripts."},
            {"step": 3, "command": "ping -c 3 -W 1 <default_gateway>", "expected": "0% packet loss, RTT < 1.0ms to Top-of-Rack switch", "if_failed": "ARP resolution failure or TOR switch SVI down."},
            {"step": 4, "command": "ip neigh show <default_gateway>", "expected": "Gateway MAC address listed with state REACHABLE", "if_failed": "Layer 2 VLAN mismatch or port isolation configured."}
        ]
    },
    {
        "id": "NET-FLOW-03",
        "title": "Layer 4/7: DNS Resolution & TCP Port Reachability",
        "description": "Step-by-step diagnostic workflow for DNS lookups, sockets, and end-to-end transport",
        "steps": [
            {"step": 1, "command": "cat /etc/resolv.conf", "expected": "Nameserver IPs configured and reachable", "if_failed": "Verify DNS server addresses and search domain configuration."},
            {"step": 2, "command": "getent hosts <target_hostname>", "expected": "Translates hostname to valid IPv4 address", "if_failed": "NXDOMAIN or timeout; verify DNS record in zone file."},
            {"step": 3, "command": "ss -tuln", "expected": "Target service daemon listening on expected port", "if_failed": "Service process down or bound to incorrect interface."},
            {"step": 4, "command": "nc -zv -w 2 <target_ip> <port>", "expected": "Connection to target port succeeded", "if_failed": "Firewall (iptables/nftables) or security list blocking port."}
        ]
    }
]

# 4. 42U Rack Elevation & Physical Layout Data
RACK_ELEVATION_DATA = {
    "rack_id": "R14-A",
    "total_u": 42,
    "pdu_a_circuit": "PDU-14A-L1 (208V / 30A)",
    "pdu_b_circuit": "PDU-14B-L2 (208V / 30A)",
    "current_load_kw": 8.4,
    "max_rated_kw": 12.0,
    "inlet_temp_c": 21.6,
    "exhaust_temp_c": 32.1,
    "units": [
        {"u": 42, "asset": "TOR Switch 01 (Cisco Nexus 9336C-FX2)", "type": "NETWORK", "status": "OK"},
        {"u": 41, "asset": "TOR Switch 02 (Cisco Nexus 9336C-FX2)", "type": "NETWORK", "status": "OK"},
        {"u": 40, "asset": "Console Terminal Server (Opengear CM7148)", "type": "MANAGEMENT", "status": "OK"},
        {"u": 39, "asset": "1U Fiber Patch Panel (48x LC OM4)", "type": "PASSIVE", "status": "OK"},
        {"u": 38, "asset": "1U Blanking Panel (Airflow management)", "type": "AIRFLOW", "status": "OK"},
        {"u": 37, "asset": "SRV-OCI-E4-8492 (Oracle BM.Standard.E4)", "type": "COMPUTE", "status": "DEGRADED"},
        {"u": 36, "asset": "SRV-OCI-E4-8492 (2U Chassis Lower)", "type": "COMPUTE", "status": "DEGRADED"},
        {"u": 35, "asset": "1U Blanking Panel", "type": "AIRFLOW", "status": "OK"},
        {"u": 34, "asset": "SRV-OCI-E4-8493 (Oracle BM.Standard.E4)", "type": "COMPUTE", "status": "OK"},
        {"u": 33, "asset": "SRV-OCI-E4-8493 (2U Chassis Lower)", "type": "COMPUTE", "status": "OK"},
        {"u": 25, "asset": "SRV-OCI-STOR-9104 (4U High-I/O Storage)", "type": "STORAGE", "status": "WARNING"},
        {"u": 20, "asset": "In-Rack Cable Management Horizontal Duct", "type": "CABLE_MGMT", "status": "OK"},
        {"u": 15, "asset": "SRV-OCI-E3-2041 (Oracle BM.Standard.E3)", "type": "COMPUTE", "status": "OK"},
        {"u": 10, "asset": "SRV-OCI-E3-2042 (Oracle BM.Standard.E3)", "type": "COMPUTE", "status": "OK"},
        {"u": 5, "asset": "SRV-OCI-E3-2043 (Oracle BM.Standard.E3)", "type": "COMPUTE", "status": "OK"},
        {"u": 1, "asset": "Bottom Air Dam / Heavy Duty Anti-Tip Plate", "type": "SAFETY", "status": "OK"}
    ]
}

# 5. OCI DCT Technical Interview & Knowledge Prep
OCI_INTERVIEW_PREP_DATA = {
    "role": "Oracle Cloud Infrastructure (OCI) Data Center Operations Technician",
    "focus_areas": [
        {
            "category": "Hardware Break-Fix & Field Replacement Units (FRU)",
            "key_concepts": "Hot-swappable vs cold-swappable components; ESD precautions; server POST sequence and UEFI debug codes; IPMI/BMC Out-of-band management; RAID/NVMe replacement; thermal paste application and torque specs.",
            "sample_questions": [
                {
                    "q": "What exact steps do you take before and during replacing a failed power supply unit (PSU) on a production bare metal server?",
                    "answer": "1. Confirm ticket asset tag, rack location, and serial number. 2. Verify redundant PSU is operational and bearing the load without alarm. 3. Confirm target PSU fault LED. 4. Release AC cord retention clip and disconnect cord. 5. Press PSU release lever and slide unit out. 6. Slide replacement FRU into bay until positive latch click. 7. Reconnect AC cord and engage clip. 8. Verify PSU status LED turns solid green and check IPMI telemetry (`ipmitool sdr elist | grep -i psu`). 9. Update DCIM inventory and close ticket."
                },
                {
                    "q": "A high-performance NVMe storage node is reporting uncorrectable errors on drive bay 7. How do you replace it without risking data loss?",
                    "answer": "1. Check software array state (RAID or ZFS pool) to verify sufficient parity redundancy before physical removal. 2. Use `nvme-cli` or `ledctl locate` to blink the identify LED on Bay 7 to eliminate pull error. 3. Issue software offline command to unmount or detach drive. 4. Wait 30 seconds for spindle/controller shutdown. 5. Unlatch carrier, slide out defective drive, and install identical enterprise NVMe replacement. 6. Lock carrier lever, confirm power LED, and initiate array resilvering/rebuilding. 7. Monitor rebuild progress until healthy."
                }
            ]
        },
        {
            "category": "Linux Diagnostics & Systems Troubleshooting",
            "key_concepts": "Safe read-only CLI inspection (`uname`, `df -h`, `free -h`, `ip link`, `ethtool`, `journalctl`, `ss -tuln`); understanding load averages; diagnosing OOM killer events; filesystem mounts; systemd service states.",
            "sample_questions": [
                {
                    "q": "A server is reachable over SSH but responds very sluggishly. How would you systematically diagnose it using only read-only Linux commands?",
                    "answer": "1. Run `uptime` to check 1, 5, and 15-minute load averages against CPU core count (`nproc`). 2. Run `free -h` to verify available memory and check if swap is actively thrashing. 3. Run `ps -eo pid,user,pcpu,pmem,comm --sort=-pcpu | head -n 10` to identify CPU-hogging processes. 4. Run `df -hT` to check if root or /var filesystem reached 100% exhaustion. 5. Check `dmesg -T | tail -n 30` and `journalctl -p 3 -n 30 --no-pager` for kernel panics, I/O timeouts, or OOM-killer invocations."
                },
                {
                    "q": "How do you distinguish between a failed Linux service and a network port binding conflict?",
                    "answer": "Use `systemctl status <service>` and `journalctl -u <service> -n 30` to inspect exit codes. If status is inactive/failed, inspect socket bindings with `ss -tuln | grep <port>`. If another process holds the port (EADDRINUSE), identify it using `ss -tulpn`. If no process is bound and connection attempts fail with ECONNREFUSED, the service simply crashed and needs startup logs triaged."
                }
            ]
        },
        {
            "category": "Data Center Networking & Cabling Standards",
            "key_concepts": "Transceiver types (SFP28 25G, QSFP28 100G, QSFP-DD 400G, DAC vs AOC vs Optical); fiber optic cleanliness; bend radius rules; duplex LC vs MPO; link flap troubleshooting; reading `ethtool -m` optical telemetry; CRC errors.",
            "sample_questions": [
                {
                    "q": "A 100GbE QSFP28 uplink to a Top-of-Rack switch is experiencing intermittent CRC errors and dropped packets. How do you isolate the root cause?",
                    "answer": "1. Run `ethtool -S <iface> | grep crc` to see if CRC error count is actively incrementing. 2. Check optical diagnostics with `ethtool -m <iface>` for RX/TX optical power (normal is -4 to -8 dBm; <-14 dBm indicates severe loss). 3. Check physical fiber routing for tight bends (<30mm radius) or overtightened zip-ties. 4. Inspect and clean optical connectors using a dedicated one-click dry cleaner. 5. Swap fiber patch jumper with known-good cable. 6. If issue persists, replace the QSFP28 transceiver. 7. If still failing, escalate to network team for switch port diagnostic."
                }
            ]
        },
        {
            "category": "Data Center Power, Cooling & Physical Safety",
            "key_concepts": "Dual-corded redundant power (Feed A and Feed B); PDU load balancing; cold aisle vs hot aisle containment; blanking panels for airflow management; CRAC/CRAH unit redundancy (N+1, N+2); PUE; ESD grounding procedures; heavy lift limits.",
            "sample_questions": [
                {
                    "q": "Why are blanking panels required in empty rack units, and what happens to server thermals if they are missing?",
                    "answer": "Blanking panels prevent hot exhaust air from recirculating from the hot aisle back over the top or sides into the cold aisle server intakes. Without blanking panels, upper rack units inhale warm air (often >30°C instead of 21°C), causing server fans to ramp to 100% RPM, increasing power draw, and triggering thermal throttling on CPUs and storage."
                },
                {
                    "q": "What is the procedure when responding to a PDU loss-of-redundancy alarm during your shift?",
                    "answer": "1. Acknowledge alarm within SLA window (usually <15m). 2. Identify affected rack and server assets. 3. Verify alternate PDU feed is stable and not exceeding 80% circuit capacity. 4. Visually inspect physical PDU branch breaker, input cords, and receptacle seating. 5. If breaker tripped without apparent cause, DO NOT immediately reset without checking for short circuits or contacting Facilities Electrical. 6. Document findings in ticket, notify shift lead, and coordinate repair under approved SOP."
                }
            ]
        }
    ]
}
