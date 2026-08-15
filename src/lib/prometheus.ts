export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export interface MetricFamily {
  name: string;
  help?: string;
  type?: string;
  samples: MetricSample[];
}

export interface ParsedPrometheusMetrics {
  // Process / System
  cpuPercent: number;
  memoryRssBytes: number;
  memoryVmsBytes: number;
  openFds: number;
  uptimeSeconds: number;

  // Swarm & Connections
  swarmPeers: number;
  swarmConnectionsTotal: number;
  activeByTransport: Record<string, number>;
  activeByDirection: Record<string, number>;
  activePeersByAge: Record<string, number>;
  connectsByTransport: Record<string, number>;
  disconnectsByTransport: Record<string, number>;
  disconnectReasons: Record<string, number>;

  // Auto-Connector State
  autoConnector: {
    lowWatermark: number;
    highWatermark: number;
    minConnections: number;
    maxConnections: number;
    inFlightDials: number;
  };

  // Streams
  streamsOpenedTotal: number;
  streamsClosedTotal: number;
  streamsLeakedTotal: number;
  streamsResetsTotal: number;
  streamsActiveByProtocol: Record<string, number>;

  // Storage & Bitswap & DHT
  blockstoreBlocksTotal: number;
  blockstoreSizeBytes: number;
  bitswapBytesSent: number;
  bitswapBytesReceived: number;
  bitswapMessagesSent: number;
  bitswapMessagesReceived: number;
  gcRunsTotal: number;
  gcReclaimedBlocksTotal: number;

  // All parsed families & raw text
  rawText: string;
  families: Record<string, MetricFamily>;
}

export function parsePrometheusText(text: string): ParsedPrometheusMetrics {
  const families: Record<string, MetricFamily> = {};
  const lines = text.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("# HELP ")) {
      const parts = line.substring(7).trim().split(" ");
      const name = parts[0];
      const help = parts.slice(1).join(" ");
      if (!families[name]) {
        families[name] = { name, samples: [] };
      }
      families[name].help = help;
      continue;
    }

    if (line.startsWith("# TYPE ")) {
      const parts = line.substring(7).trim().split(" ");
      const name = parts[0];
      const type = parts[1];
      if (!families[name]) {
        families[name] = { name, samples: [] };
      }
      families[name].type = type;
      continue;
    }

    if (line.startsWith("#")) continue;

    // Metric sample line: metric_name{labels} value [timestamp]
    // or: metric_name value [timestamp]
    let metricName = "";
    const labels: Record<string, string> = {};
    let valueStr = "";

    const braceStart = line.indexOf("{");
    if (braceStart !== -1) {
      metricName = line.substring(0, braceStart).trim();
      const braceEnd = line.lastIndexOf("}");
      if (braceEnd !== -1) {
        const labelsContent = line.substring(braceStart + 1, braceEnd);
        // parse key="value" pairs, handling escaped quotes
        const labelRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        let match;
        while ((match = labelRegex.exec(labelsContent)) !== null) {
          labels[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        }
        valueStr = line.substring(braceEnd + 1).trim().split(/\s+/)[0];
      }
    } else {
      const spaceIdx = line.search(/\s/);
      if (spaceIdx !== -1) {
        metricName = line.substring(0, spaceIdx).trim();
        valueStr = line.substring(spaceIdx).trim().split(/\s+/)[0];
      } else {
        continue;
      }
    }

    const value = parseFloat(valueStr);
    if (!Number.isFinite(value)) continue;

    // Find base family name (e.g. for histogram _bucket, _sum, _count)
    let baseName = metricName;
    if (
      metricName.endsWith("_bucket") ||
      metricName.endsWith("_sum") ||
      metricName.endsWith("_count") ||
      metricName.endsWith("_created")
    ) {
      const root = metricName.substring(0, metricName.lastIndexOf("_"));
      if (families[root]) {
        baseName = root;
      }
    }

    if (!families[baseName]) {
      families[baseName] = { name: baseName, samples: [] };
    }

    families[baseName].samples.push({
      name: metricName,
      labels,
      value,
    });
  }

  // Build aggregated typed output
  const result: ParsedPrometheusMetrics = {
    cpuPercent: 0,
    memoryRssBytes: 0,
    memoryVmsBytes: 0,
    openFds: 0,
    uptimeSeconds: 0,
    swarmPeers: 0,
    swarmConnectionsTotal: 0,
    activeByTransport: {},
    activeByDirection: {},
    activePeersByAge: {},
    connectsByTransport: {},
    disconnectsByTransport: {},
    disconnectReasons: {},
    autoConnector: {
      lowWatermark: 0,
      highWatermark: 0,
      minConnections: 0,
      maxConnections: 0,
      inFlightDials: 0,
    },
    streamsOpenedTotal: 0,
    streamsClosedTotal: 0,
    streamsLeakedTotal: 0,
    streamsResetsTotal: 0,
    streamsActiveByProtocol: {},
    blockstoreBlocksTotal: 0,
    blockstoreSizeBytes: 0,
    bitswapBytesSent: 0,
    bitswapBytesReceived: 0,
    bitswapMessagesSent: 0,
    bitswapMessagesReceived: 0,
    gcRunsTotal: 0,
    gcReclaimedBlocksTotal: 0,
    rawText: text,
    families,
  };

  for (const family of Object.values(families)) {
    for (const sample of family.samples) {
      const { name, labels, value } = sample;

      // Process & System
      if (name === "ipfs_process_cpu_percent" || name === "process_cpu_percent") {
        result.cpuPercent = value;
      } else if (name === "ipfs_process_memory_rss_bytes" || name === "process_resident_memory_bytes") {
        result.memoryRssBytes = value;
      } else if (name === "ipfs_process_memory_vms_bytes" || name === "process_virtual_memory_bytes") {
        result.memoryVmsBytes = value;
      } else if (name === "ipfs_process_open_fds" || name === "process_open_fds") {
        result.openFds = value;
      } else if (name === "ipfs_process_uptime_seconds") {
        result.uptimeSeconds = value;
      }

      // Swarm
      else if (name === "ipfs_swarm_peers") {
        result.swarmPeers = value;
      } else if (name === "ipfs_swarm_connections_total") {
        result.swarmConnectionsTotal = value;
      } else if (name === "ipfs_swarm_connections") {
        const t = labels.transport;
        const d = labels.direction;
        if (t && t !== "all") {
          result.activeByTransport[t] = value;
        }
        if (d && d !== "all") {
          result.activeByDirection[d] = value;
        }
      } else if (name === "ipfs_swarm_peers_by_age") {
        const bucket = labels.age_bucket || "unknown";
        result.activePeersByAge[bucket] = value;
      } else if (name === "ipfs_swarm_connects_total") {
        const t = labels.transport || "all";
        result.connectsByTransport[t] = value;
      } else if (name === "ipfs_swarm_disconnects_total") {
        const t = labels.transport || "all";
        result.disconnectsByTransport[t] = value;
      } else if (name === "ipfs_swarm_disconnect_reasons_total") {
        const reason = labels.reason_hint || "unknown";
        result.disconnectReasons[reason] = value;
      }

      // AutoConnector
      else if (name === "ipfs_autoconnector_state") {
        const m = labels.metric;
        if (m === "low_watermark") result.autoConnector.lowWatermark = value;
        else if (m === "high_watermark") result.autoConnector.highWatermark = value;
        else if (m === "min_connections") result.autoConnector.minConnections = value;
        else if (m === "max_connections") result.autoConnector.maxConnections = value;
        else if (m === "in_flight_dials") result.autoConnector.inFlightDials = value;
      }

      // Streams
      else if (name === "ipfs_streams_opened_total") {
        result.streamsOpenedTotal = value;
      } else if (name === "ipfs_streams_closed_total") {
        result.streamsClosedTotal = value;
      } else if (name === "ipfs_streams_leaked_total") {
        result.streamsLeakedTotal = value;
      } else if (name === "ipfs_streams_resets_total") {
        result.streamsResetsTotal = value;
      } else if (name === "ipfs_streams_active") {
        const proto = labels.protocol || "unknown";
        result.streamsActiveByProtocol[proto] = value;
      }

      // BlockStore & Bitswap & GC
      else if (name === "ipfs_blockstore_blocks_total") {
        result.blockstoreBlocksTotal = value;
      } else if (name === "ipfs_blockstore_size_bytes") {
        result.blockstoreSizeBytes = value;
      } else if (name === "ipfs_bitswap_bytes_sent_total") {
        result.bitswapBytesSent = value;
      } else if (name === "ipfs_bitswap_bytes_received_total") {
        result.bitswapBytesReceived = value;
      } else if (name === "ipfs_bitswap_messages_sent_total") {
        result.bitswapMessagesSent = value;
      } else if (name === "ipfs_bitswap_messages_received_total") {
        result.bitswapMessagesReceived = value;
      } else if (name === "ipfs_gc_runs_total") {
        result.gcRunsTotal = value;
      } else if (name === "ipfs_gc_reclaimed_blocks_total") {
        result.gcReclaimedBlocksTotal = value;
      }
    }
  }

  return result;
}
