---
status: accepted
---

# Synthetic headline selection and paired WAN directions

## Context

ADR-0003 allowed one headline per dimension. Network needs download and upload visible together:
a single direction cannot represent both inbound and outbound WAN throughput.

## Decision

Supersede only ADR-0003's single-headline restriction for network. Network has exactly two
headlines: iperf3 WAN download and upload in Mbits/sec. All other dimensions retain exactly one.
CPU leads with Node.js web tooling, disk with fio buffered 4KB random-write bandwidth in MB/s,
memory with STREAM Triad in MB/s, and system with Git common operations in seconds. Editorial overrides own selection; generated identities,
units, measurement data and ranking methods remain unchanged.

## Consequences

The leaderboard shows every available headline chart above the section's collapsed tables,
without duplicating it inside. The singular headlineMetric helper retains the first headline in
catalog order for existing consumers. Catalog checks guard the expected counts and selected WAN ids.
Buffered disk bandwidth includes cache effects; WAN throughput includes the public server and
Internet path. These remain distinct from direct I/O and loopback measurements, respectively.
