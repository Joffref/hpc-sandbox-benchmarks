# Sandbox provider leaderboard

Run [`31058786502`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/31058786502) · commit [`7ef41b3c6e60aed6cdf17e0688af3b12c9e1894f`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/7ef41b3c6e60aed6cdf17e0688af3b12c9e1894f) ·
dataset [`data/dataset/runs/31058786502.json`](data/dataset/runs/31058786502.json) · generated 2026-08-06T00:59:24.669Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **44 metric records**
backed by **385 retained trial observations**, across **44 metrics** and
**1 provider**; every emitted, catalogued metric has a ranked table below
(median across sandboxes), grouped by dimension with its headline first — some behind a disclosure triangle, none omitted.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median across sandboxes (one machine, one vote) · interval = cluster bootstrap,
labelled 95% but ≈77% actual coverage at 3 sandboxes (see methodology) · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

**Document order:** the real-world developer workflows lead, because what a developer or a CI job
actually waits on is what this benchmark exists to measure. The synthetic microbenchmarks (`cpu`, `disk`, `memory`, `network`, `system`)
load one hardware axis in isolation — a real question, but a different one — so each is collapsed by
default; expand a section to read its tables.

## Providers in this run

Each provider's isolation technology — the **declared** technology is authoritative; **detected**
is a best-effort in-sandbox probe that cannot separate every isolation type (a container and a
microVM can both read `kvm`; gVisor and a microVM can both read `unknown`), shown only as a
cross-check.

| Provider | Isolation (declared) | Detected |
| --- | --- | --- |
| Blaxel | microVM | vm |

_Not present in this run: Daytona (container), Daytona (VM), E2B, Microsandbox Cloud, Microsandbox (local), Modal (gVisor), Modal (VM), Namespace, Novita, run.cloud, Runloop, Vercel Sandbox — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel is the only ranked provider (68.16 Seconds; lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 68.16 | 63.43 – 70.62 | 12 | 12 |

### Better-Auth: build

Seconds · lower is better

_Blaxel is the only ranked provider (105.8 Seconds; lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 105.8 | 102.4 – 109.1 | 11 | 11 |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel is the only ranked provider (28.42 Seconds; lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 28.42 | 27.18 – 29.82 | 11 | 11 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (8.228 Seconds; lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 8.228 | 4.75 – 290.2 | 11 | 11 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel is the only ranked provider (4.923 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 4.923 | 4.847 – 5.013 | 11 | 11 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Blaxel is the only ranked provider (25.58 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 25.58 | 24.05 – 26.02 | 11 | 11 |

### Better-Auth: lint format

Seconds · lower is better

_Blaxel is the only ranked provider (6.829 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 6.829 | 6.432 – 7.594 | 11 | 11 |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel is the only ranked provider (4.024 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 4.024 | 3.912 – 4.33 | 11 | 11 |

### Better-Auth: lint spell

Seconds · lower is better

_Blaxel is the only ranked provider (18.74 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 18.74 | 18.3 – 19.31 | 11 | 11 |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel is the only ranked provider (39.46 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 39.46 | 38.03 – 41.59 | 11 | 11 |

### Better-Auth: typecheck

Seconds · lower is better

_Blaxel is the only ranked provider (90.54 Seconds; lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 90.54 | 86.75 – 92.61 | 11 | 11 |

### Mastra: build:core

Seconds · lower is better

_Blaxel is the only ranked provider (155.5 Seconds; lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 155.5 | 154.3 – 158.6 | 12 | 12 |

### Mastra: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (35.38 Seconds; lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 35.38 | 11.66 – 409.3 | 12 | 12 |

### Mastra: lint:format

Seconds · lower is better

_Blaxel is the only ranked provider (234.1 Seconds; lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 234.1 | 225.6 – 240.2 | 12 | 12 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel is the only ranked provider (27.65 Seconds; lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 27.65 | 26.12 – 29.95 | 11 | 11 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (23.84 Seconds; lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 23.84 | 17.99 – 598.3 | 11 | 11 |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Blaxel is the only ranked provider (123.2 Seconds; lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 123.2 | 115.5 – 124.7 | 11 | 11 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel is the only ranked provider (24.82 Seconds; lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 24.82 | 24.61 – 26.03 | 11 | 11 |

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel is the only ranked provider (9.18 runs/s; higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 9.18 | 8.39 – 9.26 | 3 | 9 |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel is the only ranked provider (289000 IOPS; higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 289000 | 273500 – 300000 | 3 | 6 |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (1131 MB/s; higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 1131 | 1068 – 1172 | 3 | 6 |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (156500 IOPS; higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 156500 | 152500 – 171500 | 3 | 6 |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (611.5 MB/s; higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 611.5 | 597.5 – 669 | 3 | 6 |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (3233 IOPS; higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 3233 | 3199 – 3409 | 3 | 6 |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (3234 MB/s; higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 3234 | 3200 – 3411 | 3 | 6 |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (3040 IOPS; higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 3040 | 2762 – 3253 | 3 | 6 |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (3041 MB/s; higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 3041 | 2764 – 3255 | 3 | 6 |

### Hardlink throughput

bogo ops/s · higher is better

_Blaxel is the only ranked provider (15.01 bogo ops/s; higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 15.01 | 14.79 – 15.13 | 3 | 6 |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel is the only ranked provider (62900 MB/s; higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 62900 | 62570 – 63230 | 2 | 10 |

### STREAM Add

MB/s · higher is better

_Blaxel is the only ranked provider (63010 MB/s; higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 63010 | 62950 – 63060 | 2 | 10 |

### STREAM Copy

MB/s · higher is better

_Blaxel is the only ranked provider (82400 MB/s; higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 82400 | 81890 – 82910 | 2 | 18 |

### STREAM Scale

MB/s · higher is better

_Blaxel is the only ranked provider (60780 MB/s; higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 60780 | 60510 – 61040 | 2 | 10 |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Blaxel is the only ranked provider (59250 Mbits/sec; higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 59250 | 51507 – 62810 | 3 | 6 |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel is the only ranked provider (61100 Mbits/sec; higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 61100 | 59730 – 63978 | 3 | 6 |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel is the only ranked provider (9999 Mbits/sec; higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 9999 | 9999 – 10000 | 3 | 6 |

### iperf3 WAN download

Mbits/sec · higher is better

_Blaxel is the only ranked provider (1245 Mbits/sec; higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 1245 | 1178 – 1356 | 3 | 6 |

### iperf3 WAN upload

Mbits/sec · higher is better

_Blaxel is the only ranked provider (2.665 Mbits/sec; higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 2.665 | 2.56 – 2.665 | 3 | 6 |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (576.5 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 576.5 | 574.5 – 612 | 3 | 6 |

### Git common operations

Seconds · lower is better

_Blaxel is the only ranked provider (58.92 Seconds; lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 58.92 | 55.41 – 59.65 | 3 | 6 |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel is the only ranked provider (258800 TPS; higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 258800 | 253400 – 259600 | 3 | 6 |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel is the only ranked provider (0.1935 ms; lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 0.1935 | 0.1925 – 0.197 | 3 | 6 |

### pgbench RW (s100, 50c)

TPS · higher is better

_Blaxel is the only ranked provider (17160 TPS; higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 17160 | 16700 – 18260 | 3 | 6 |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Blaxel is the only ranked provider (2.915 ms; lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 2.915 | 2.74 – 2.994 | 3 | 6 |

### SQLite Speedtest

Seconds · lower is better

_Blaxel is the only ranked provider (52.83 Seconds; lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 52.83 | 51.65 – 54.52 | 3 | 6 |

</details>

## Coverage gaps

5 uncovered results across 1 provider (Blaxel 5). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | memory | **failed** | Step "install mise" timed out after 300s |
| Blaxel | realworld-better-auth | **failed** | Step "install mise" timed out after 300s |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Step "install mise" timed out after 300s |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

</details>

<details>
<summary>How rankings are decided</summary>

The value is the median of the PER-SANDBOX medians — one machine, one vote — not the median of all
trials pooled together. Pooling would weight each machine by how many trials it ran, and the harness
chooses that count adaptively by watching the variance, so the noisiest machine would carry the most
weight in the published number. The median, not the mean, because a single stalled pass drags a mean
far more than it moves a median.

The interval is a cluster bootstrap of that same statistic (10,000 resamples, seeded from the Run id
so the table is reproducible byte-for-byte): whole sandboxes are resampled with replacement, keeping
each machine's trials intact.

**The interval is labelled 95%, and at these sandbox counts it does not achieve 95%.** Coverage is a
property of how many machines were measured, not of the estimator: simulated at ≈77% for 3 sandboxes,
≈92% at 6, and ≈95% at 20. No percentile bootstrap reaches nominal coverage at 3 clusters. Read a
3-sandbox interval as a resampling envelope over three machines, **not** as a calibrated frequentist
confidence interval. Within-sandbox trials may also be dependent on host scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. Where
replicate sandboxes exist that test runs on the PER-SANDBOX MEDIANS, so whole machines are the
exchangeable unit; testing pooled trials instead would treat repeated measurements of one machine as
independent evidence about the provider. KS is reported separately for distribution *shape* and does
not drive the ranking.

Each metric is measured on several independent sandboxes (the **Sandboxes** column), and within each
sandbox the benchmark runs several trials (**Trials**). Trials capture within-machine noise —
neighbours, host contention, virtualization; sandboxes capture the machine-to-machine variation a
user actually experiences when they start a new environment. The ranking and its interval both treat
the SANDBOX as the unit, so more trials on the same machine never make a row look better-evidenced.
Under adaptive trial counts a large **Trials** figure is in fact a sign the machines were unstable
(the harness kept re-running), not that the estimate is precise.

At the sandbox counts this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

</details>

