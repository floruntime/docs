---
title: Clustering
description: Multi-node cluster setup with SWIM gossip and Raft consensus.
---

## Overview

Flo clusters consist of multiple nodes that coordinate via:

- **SWIM gossip** — failure detection, membership protocol, metadata dissemination
- **Raft consensus** — per-partition replication with leader election
- **Controller Raft** — runs on Shard 0, manages the global partition table
- **Partition Table** — maps each partition to its owning node(s)

## Cluster Formation

### Seed Nodes

Each node needs at least one seed address to join the cluster:

```toml title="flo.toml"
[cluster]
seeds = ["10.0.1.10:9000", "10.0.1.11:9000", "10.0.1.12:9000"]
node_id = 1
```

Or via environment variables:

```bash
FLO_CLUSTER_SEEDS=10.0.1.10:9000,10.0.1.11:9000
FLO_NODE_ID=1
```

### Bootstrap

The first node in a cluster bootstraps automatically when no seeds respond. Subsequent nodes join by contacting any existing member.

```bash
# First node (bootstraps)
flo server start --node-id 1 --port 9000

# Second node (joins via seed)
flo server start --node-id 2 --port 9000 --seeds 10.0.1.10:9000

# Third node
flo server start --node-id 3 --port 9000 --seeds 10.0.1.10:9000,10.0.1.11:9000
```

## Partitioning

Data is distributed across nodes using hash-based partitioning:

```
hash(key) → partition_id (0..N)
partition_table[partition_id] → (leader_node, replica_nodes)
```

The default partition count is 64. Each partition is a Raft group with a configurable replication factor (default: 3).

### Partition Assignment

The Controller Raft on Shard 0 manages partition assignments:

| Event | Action |
|-------|--------|
| Node joins | Rebalance partitions to include new node |
| Node leaves (graceful) | Migrate partitions before shutdown |
| Node fails (detected by SWIM) | Raft elects new leader from remaining replicas |
| Manual rebalance | Trigger via REST API or CLI |

## Replication

Each partition is a Raft group. The leader handles all writes; followers replicate:

```
Client → Leader Node → Raft propose
  → Replicate to quorum (N/2+1 nodes)
  → Commit → Apply to UAL → Update Projections
  → Respond to client
```

### Replication Factor

```toml
[cluster]
replication_factor = 3  # 1 leader + 2 followers per partition
```

With `replication_factor = 3`, the cluster tolerates 1 node failure per partition without data loss. With `replication_factor = 5`, it tolerates 2.

## Failure Handling

### SWIM Protocol

SWIM (Scalable Weakly-consistent Infection-style Membership) detects failures in O(log N) time:

1. Each node periodically **pings** a random peer
2. If no response, requests **indirect pings** through other members
3. If still no response, marks the node as **suspect**
4. After a configurable timeout, marks as **failed**

Parameters:

| Setting | Default | Description |
|---------|---------|-------------|
| `gossip.interval_ms` | 1000 | Ping interval |
| `gossip.suspect_timeout_ms` | 5000 | Time before suspect → failed |
| `gossip.indirect_checks` | 3 | Number of indirect ping relays |

### Leader Election

When a Raft leader fails:

1. SWIM detects the failure
2. Followers notice missing heartbeats
3. A follower with the most up-to-date log starts a pre-vote
4. If pre-vote succeeds, starts an election
5. New leader elected and begins accepting writes

Typical failover time: **2-5 seconds** (SWIM detection + Raft election).

## Monitoring

### Cluster Status

```bash
flo cluster status
```

### Prometheus Metrics

Key cluster metrics on port 9001:

| Metric | Description |
|--------|-------------|
| `flo_cluster_nodes` | Number of nodes in the cluster |
| `flo_cluster_partitions` | Total partition count |
| `flo_raft_leader_elections_total` | Leader election count |
| `flo_raft_replication_lag` | Replication lag in entries |
| `flo_gossip_members` | Active SWIM members |

## Recommended Topologies

### Development

1 node, shard_count = 1, no replication.

### Small Production

3 nodes, replication_factor = 3. Tolerates 1 node failure.

### Large Production

5+ nodes, replication_factor = 3, 128+ partitions. Allows rolling upgrades with maintained quorum.

```toml
[cluster]
seeds = ["10.0.1.10:9000", "10.0.1.11:9000", "10.0.1.12:9000"]
replication_factor = 3
partition_count = 128

[node]
shard_count = 8  # Match CPU core count
```
