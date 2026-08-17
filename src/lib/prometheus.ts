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
  pid: number;
  cpuPercent: number;
  memoryRssBytes: number;
  memoryVmsBytes: number;
  openFds: number;
  uptimeSeconds: number;

  // Swarm & Connections
  swarmPeers: number;
  swarmConnectionsTotal: number;
  peersOver30m: number;
  peersOver10m: number;
  peersOver5m: number;
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
  streamsOutboundTotal: number;
  streamsInboundTotal: number;
  streamsOutboundActive: number;
  streamsInboundActive: number;
  streamsLeakedTotal: number;
  streamsResetsTotal: number;
  streamsActiveByProtocol: Record<string, number>;
  streamsTotalByProtocol: Record<string, number>;
  streamsTotalByProtocolOutbound: Record<string, number>;
  streamsTotalByProtocolInbound: Record<string, number>;
  streamsActiveByDirection: Record<string, number>;

  // Storage & Bitswap & DHT
  blockstoreBlocksTotal: number;
  blockstoreSizeBytes: number;
  bitswapBytesSent: number;
  bitswapBytesReceived: number;
  bitswapMessagesSent: number;
  bitswapMessagesReceived: number;
  gcRunsTotal: number;
  gcReclaimedBlocksTotal: number;

  // libp2p event-bus metric families (transport/muxer/security/identity/
  // kad/bitswap/discovery/ping/relay/request-response/gossipsub)
  libp2p: Libp2pStackMetrics;

  // All parsed families & raw text
  rawText: string;
  families: Record<string, MetricFamily>;
}

export interface Libp2pStackMetrics {
  transport: {
    dials: Record<string, Record<"success" | "failure", number>>;
    inbound: Record<string, Record<"success" | "failure", number>>;
  };
  swarm: {
    dialAttempts: number;
    dialErrors: number;
    incoming: number;
    incomingErrors: number;
  };
  security: {
    handshakes: Record<"success" | "failure", number>;
    byProtocol: Record<string, Record<"success" | "failure", number>>;
    byDirection: Record<string, Record<"success" | "failure", number>>;
    avgDurationMs: number;
  };
  muxer: {
    conns: Record<string, Record<"inbound" | "outbound", number>>;
    streamsOpen: Record<"inbound" | "outbound", number>;
    streamsClosed: Record<"inbound" | "outbound", number>;
    upgradeFailures: Record<"inbound" | "outbound", number>;
  };
  connections: { opened: Record<string, number>; closed: Record<string, number> };
  identity: {
    identify: Record<"success" | "failure", number>;
    push: Record<"success" | "failure", number>;
  };
  kad: {
    putValue: { success: number; failure: number };
    getValue: { success: number; failure: number };
    lookups: { success: number; failure: number };
    lookupDurationMs: number;
    peersFoundPerLookup: number;
    peersQueriedPerLookup: number;
    provide: { success: number; failure: number };
    providersAnnounced: number;
    findPeer: { success: number; failure: number };
    findProviders: { success: number; failure: number };
    providersFoundPerQuery: number;
    inbound: Record<string, number>;
    rateLimited: number;
    recordValidation: number;
    refresh: number;
    republish: number;
    routingTablePeers: number;
    streamResets: number;
  };
  bitswap: {
    wantlistAdds: number;
    wantlistCancels: number;
    sessions: number;
    blocksSent: number;
    blocksReceived: number;
    blockBytesSent: number;
    blockBytesReceived: number;
    messagesSent: number;
    messagesReceived: number;
    messageBytesReceived: number;
    providerQueries: number;
    providerQueriesFound: number;
  };
  discovery: {
    bootstrapConnects: number;
    bootstrapAvgMs: number;
    peersDiscovered: number;
    peersLost: number;
    randomWalks: number;
    peersPerWalk: number;
  };
  ping: { count: number; avgMs: number; failures: number; buckets: { le: number; count: number }[] };
  relay: { reservations: number; hops: number; forwardedBytes: number };
  requestResponse: { requests: number; avgLatencyMs: number };
  gossipsub: {
    published: number;
    received: number;
    outBytes: number;
    messageBytes: number;
    subscriptionChanges: number;
    control: number;
    subopts: number;
  };
}

export function parsePrometheusText(text: string): ParsedPrometheusMetrics {  const families: Record<string, MetricFamily> = {};
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
    pid: 0,
    cpuPercent: 0,
    memoryRssBytes: 0,
    memoryVmsBytes: 0,
    openFds: 0,
    uptimeSeconds: 0,
    swarmPeers: 0,
    swarmConnectionsTotal: 0,
    peersOver30m: 0,
    peersOver10m: 0,
    peersOver5m: 0,
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
    streamsOutboundTotal: 0,
    streamsInboundTotal: 0,
    streamsOutboundActive: 0,
    streamsInboundActive: 0,
    streamsLeakedTotal: 0,
    streamsResetsTotal: 0,
    streamsActiveByProtocol: {},
    streamsTotalByProtocol: {},
    streamsTotalByProtocolOutbound: {},
    streamsTotalByProtocolInbound: {},
    streamsActiveByDirection: {},
    blockstoreBlocksTotal: 0,
    blockstoreSizeBytes: 0,
    bitswapBytesSent: 0,
    bitswapBytesReceived: 0,
    bitswapMessagesSent: 0,
    bitswapMessagesReceived: 0,
    gcRunsTotal: 0,
    gcReclaimedBlocksTotal: 0,
    libp2p: emptyLibp2pStack(),
    rawText: text,
    families,
  };

  for (const family of Object.values(families)) {
    for (const sample of family.samples) {
      const { name, labels, value } = sample;

      // Process & System
      if (name === "ipfs_process_pid") {
        result.pid = Math.round(value);
      } else if (name === "ipfs_process_cpu_percent" || name === "process_cpu_percent") {
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
      } else if (name === "ipfs_swarm_peers_connected_over_30m") {
        result.peersOver30m = Math.round(value);
      } else if (name === "ipfs_swarm_peers_connected_over_10m") {
        result.peersOver10m = Math.round(value);
      } else if (name === "ipfs_swarm_peers_connected_over_5m") {
        result.peersOver5m = Math.round(value);
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
      } else if (name === "ipfs_streams_outbound_total") {
        result.streamsOutboundTotal = value;
      } else if (name === "ipfs_streams_inbound_total") {
        result.streamsInboundTotal = value;
      } else if (name === "ipfs_streams_outbound_active") {
        result.streamsOutboundActive = value;
      } else if (name === "ipfs_streams_inbound_active") {
        result.streamsInboundActive = value;
      } else if (name === "ipfs_streams_active_by_direction") {
        const d = labels.direction || "unknown";
        result.streamsActiveByDirection[d] = value;
      } else if (name === "ipfs_streams_leaked_total") {
        result.streamsLeakedTotal = value;
      } else if (name === "ipfs_streams_resets_total") {
        result.streamsResetsTotal = value;
      } else if (name === "ipfs_streams_active") {
        const proto = labels.protocol || "unknown";
        result.streamsActiveByProtocol[proto] = value;
      } else if (name === "ipfs_streams_by_protocol_total") {
        const proto = labels.protocol || "unknown";
        const dir = labels.direction || "all";
        if (dir === "outbound") {
          result.streamsTotalByProtocolOutbound[proto] = value;
        } else if (dir === "inbound") {
          result.streamsTotalByProtocolInbound[proto] = value;
        } else {
          result.streamsTotalByProtocol[proto] = value;
        }
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

  result.libp2p = aggregateLibp2pStack(families);

  return result;
}

function emptyLibp2pStack(): Libp2pStackMetrics {
  return {
    transport: { dials: {}, inbound: {} },
    swarm: { dialAttempts: 0, dialErrors: 0, incoming: 0, incomingErrors: 0 },
    security: {
      handshakes: { success: 0, failure: 0 },
      byProtocol: {},
      byDirection: {},
      avgDurationMs: 0,
    },
    muxer: {
      conns: {},
      streamsOpen: { inbound: 0, outbound: 0 },
      streamsClosed: { inbound: 0, outbound: 0 },
      upgradeFailures: { inbound: 0, outbound: 0 },
    },
    connections: { opened: {}, closed: {} },
    identity: { identify: { success: 0, failure: 0 }, push: { success: 0, failure: 0 } },
    kad: {
      putValue: { success: 0, failure: 0 },
      getValue: { success: 0, failure: 0 },
      lookups: { success: 0, failure: 0 },
      lookupDurationMs: 0,
      peersFoundPerLookup: 0,
      peersQueriedPerLookup: 0,
      provide: { success: 0, failure: 0 },
      providersAnnounced: 0,
      findPeer: { success: 0, failure: 0 },
      findProviders: { success: 0, failure: 0 },
      providersFoundPerQuery: 0,
      inbound: {},
      rateLimited: 0,
      recordValidation: 0,
      refresh: 0,
      republish: 0,
      routingTablePeers: 0,
      streamResets: 0,
    },
    bitswap: {
      wantlistAdds: 0,
      wantlistCancels: 0,
      sessions: 0,
      blocksSent: 0,
      blocksReceived: 0,
      blockBytesSent: 0,
      blockBytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messageBytesReceived: 0,
      providerQueries: 0,
      providerQueriesFound: 0,
    },
    discovery: {
      bootstrapConnects: 0,
      bootstrapAvgMs: 0,
      peersDiscovered: 0,
      peersLost: 0,
      randomWalks: 0,
      peersPerWalk: 0,
    },
    ping: { count: 0, avgMs: 0, failures: 0, buckets: [] },
    relay: { reservations: 0, hops: 0, forwardedBytes: 0 },
    requestResponse: { requests: 0, avgLatencyMs: 0 },
    gossipsub: {
      published: 0,
      received: 0,
      outBytes: 0,
      messageBytes: 0,
      subscriptionChanges: 0,
      control: 0,
      subopts: 0,
    },
  };
}

function fam(families: Record<string, MetricFamily>, name: string): MetricFamily | undefined {
  return families[name];
}

/** Sum the values of every sample in a family (per-peer_id series included). */
function sumAll(families: Record<string, MetricFamily>, name: string): number {
  const f = fam(families, name);
  if (!f) return 0;
  return f.samples.reduce((acc, s) => acc + s.value, 0);
}

/** Sum samples matching a label filter, e.g. { result: "success" }. */
function sumLabel(families: Record<string, MetricFamily>, name: string, labels: Record<string, string>): number {
  const f = fam(families, name);
  if (!f) return 0;
  return f.samples
    .filter((s) => Object.entries(labels).every(([k, v]) => s.labels[k] === v))
    .reduce((acc, s) => acc + s.value, 0);
}

function sumLabelUnlessMissing(
  families: Record<string, MetricFamily>,
  name: string,
  labels: Record<string, string>
): number {
  const f = fam(families, name);
  if (!f) return 0;
  const matched = f.samples.filter((s) => Object.entries(labels).every(([k, v]) => s.labels[k] === v));
  if (matched.length === 0) {
    // Family exists but has no samples with these labels (e.g. unlabeled counter).
    const unlabeled = f.samples.filter((s) => Object.keys(s.labels).length === 0);
    return unlabeled.length > 0 ? unlabeled.reduce((acc, s) => acc + s.value, 0) : 0;
  }
  return matched.reduce((acc, s) => acc + s.value, 0);
}

/** Mean of a histogram family: _sum / _count (optionally filtered by labels). */
function histogramAvg(
  families: Record<string, MetricFamily>,
  name: string,
  labels?: Record<string, string>
): number {
  const f = fam(families, name);
  if (!f) return 0;
  const match = (s: MetricSample) =>
    !labels || Object.entries(labels).every(([k, v]) => s.labels[k] === v);
  let sum = 0;
  let count = 0;
  for (const s of f.samples) {
    if (!match(s)) continue;
    if (s.name === `${name}_sum`) sum += s.value;
    else if (s.name === `${name}_count`) count += s.value;
  }
  return count > 0 ? sum / count : 0;
}

/** Buckets of a histogram family as [{ le, count }] (cumulative counts). */
function histogramBuckets(
  families: Record<string, MetricFamily>,
  name: string
): { le: number; count: number }[] {
  const f = fam(families, name);
  if (!f) return [];
  return f.samples
    .filter((s) => s.name === `${name}_bucket` && s.labels.le && s.labels.le !== "+Inf")
    .map((s) => ({ le: parseFloat(s.labels.le), count: s.value }))
    .sort((a, b) => a.le - b.le);
}

function aggregateLibp2pStack(families: Record<string, MetricFamily>): Libp2pStackMetrics {
  const out = emptyLibp2pStack();

  // ---- transport ----
  const transportNames = new Set<string>();
  for (const t of ["tcp", "quic", "websocket"]) {
    if (sumLabel(families, "transport_dial_total", { transport: t, result: "success" }) > 0) transportNames.add(t);
  }
  // discover transports from data instead of hardcoding
  fam(families, "transport_dial_total")?.samples.forEach((s) => {
    if (s.labels.transport) transportNames.add(s.labels.transport);
  });
  transportNames.forEach((t) => {
    out.transport.dials[t] = {
      success: sumLabel(families, "transport_dial_total", { transport: t, result: "success" }),
      failure: sumLabel(families, "transport_dial_total", { transport: t, result: "failure" }),
    };
    out.transport.inbound[t] = {
      success: sumLabel(families, "transport_inbound_conn_total", { transport: t, result: "success" }),
      failure: sumLabel(families, "transport_inbound_conn_total", { transport: t, result: "failure" }),
    };
  });

  // ---- swarm ----
  out.swarm.dialAttempts = sumAll(families, "swarm_dial_attempt_total");
  out.swarm.dialErrors = sumAll(families, "swarm_dial_attempt_error_total");
  out.swarm.incoming = sumAll(families, "swarm_incoming_conn_total");
  out.swarm.incomingErrors = sumAll(families, "swarm_incoming_conn_error_total");

  // ---- security ----
  out.security.handshakes.success = sumLabel(families, "security_handshake_total", { result: "success" });
  out.security.handshakes.failure = sumLabel(families, "security_handshake_total", { result: "failure" });
  fam(families, "security_handshake_total")?.samples.forEach((s) => {
    if (!s.labels.protocol) return;
    const p = (out.security.byProtocol[s.labels.protocol] ??= { success: 0, failure: 0 });
    if (s.labels.result === "success") p.success += s.value;
    else if (s.labels.result === "failure") p.failure += s.value;
    const d = (out.security.byDirection[s.labels.direction] ??= { success: 0, failure: 0 });
    if (s.labels.result === "success") d.success += s.value;
    else if (s.labels.result === "failure") d.failure += s.value;
  });
  out.security.avgDurationMs = histogramAvg(families, "security_handshake_duration_ms");

  // ---- muxer ----
  fam(families, "muxer_conns_total")?.samples.forEach((s) => {
    if (!s.labels.muxer) return;
    const m = (out.muxer.conns[s.labels.muxer] ??= { inbound: 0, outbound: 0 });
    if (s.labels.direction === "inbound") m.inbound += s.value;
    else if (s.labels.direction === "outbound") m.outbound += s.value;
  });
  out.muxer.streamsOpen.inbound = sumLabel(families, "muxer_streams_open_total", { direction: "inbound" });
  out.muxer.streamsOpen.outbound = sumLabel(families, "muxer_streams_open_total", { direction: "outbound" });
  out.muxer.streamsClosed.inbound = sumLabel(families, "muxer_streams_closed_total", { direction: "inbound" });
  out.muxer.streamsClosed.outbound = sumLabel(families, "muxer_streams_closed_total", { direction: "outbound" });
  out.muxer.upgradeFailures.inbound = sumLabel(families, "muxer_upgrade_failure_total", { direction: "inbound" });
  out.muxer.upgradeFailures.outbound = sumLabel(families, "muxer_upgrade_failure_total", { direction: "outbound" });

  // ---- connections ----
  fam(families, "connections_opened_total")?.samples.forEach((s) => {
    const key = s.labels.connection_type || "direct";
    out.connections.opened[key] = (out.connections.opened[key] ?? 0) + s.value;
  });
  fam(families, "connections_closed_total")?.samples.forEach((s) => {
    const key = s.labels.connection_type || "direct";
    out.connections.closed[key] = (out.connections.closed[key] ?? 0) + s.value;
  });

  // ---- identity ----
  out.identity.identify.success = sumLabel(families, "identity_identify_total", { result: "success" });
  out.identity.identify.failure = sumLabel(families, "identity_identify_total", { result: "failure" });
  out.identity.push.success = sumLabel(families, "identity_push_total", { result: "success" });
  out.identity.push.failure = sumLabel(families, "identity_push_total", { result: "failure" });

  // ---- kad ----
  out.kad.putValue.success = sumLabelUnlessMissing(families, "kad_put_value_total", { result: "success" });
  out.kad.putValue.failure = sumLabel(families, "kad_put_value_total", { result: "failure" });
  out.kad.getValue.success = sumLabelUnlessMissing(families, "kad_get_value_total", { result: "success" });
  out.kad.getValue.failure = sumLabel(families, "kad_get_value_total", { result: "failure" });
  out.kad.lookups.success = sumLabel(families, "kad_lookup_total", { result: "success" });
  out.kad.lookups.failure = sumLabel(families, "kad_lookup_total", { result: "failure" });
  out.kad.lookupDurationMs = histogramAvg(families, "kad_lookup_duration_ms");
  const lookupCount = fam(families, "kad_lookup_duration_ms")
    ?.samples.find((s) => s.name === "kad_lookup_duration_ms_count")?.value ?? 0;
  out.kad.peersFoundPerLookup = lookupCount > 0 ? histogramAvg(families, "kad_lookup_peers_found") : 0;
  out.kad.peersQueriedPerLookup = lookupCount > 0 ? histogramAvg(families, "kad_lookup_peers_queried") : 0;
  out.kad.provide.success = sumLabel(families, "kad_provide_total", { result: "success" });
  out.kad.provide.failure = sumLabel(families, "kad_provide_total", { result: "failure" });
  out.kad.providersAnnounced = sumAll(families, "kad_provide_peers_announced");
  out.kad.findPeer.success = sumLabel(families, "kad_find_peer_total", { result: "success" });
  out.kad.findPeer.failure = sumLabel(families, "kad_find_peer_total", { result: "failure" });
  out.kad.findProviders.success = sumLabel(families, "kad_find_providers_total", { result: "success" });
  out.kad.findProviders.failure = sumLabel(families, "kad_find_providers_total", { result: "failure" });
  const providerQueries = fam(families, "kad_find_providers_found")
    ?.samples.find((s) => s.name === "kad_find_providers_found_count")?.value ?? 0;
  out.kad.providersFoundPerQuery =
    providerQueries > 0 ? histogramAvg(families, "kad_find_providers_found") : 0;
  for (const key of [
    "kad_inbound_find_node_total",
    "kad_inbound_get_providers_total",
    "kad_inbound_get_value_total",
    "kad_inbound_put_value_total",
    "kad_inbound_add_provider_total",
  ]) {
    out.kad.inbound[key.replace("kad_inbound_", "").replace("_total", "")] = sumAll(families, key);
  }
  out.kad.rateLimited = sumAll(families, "kad_rate_limited_total");
  out.kad.recordValidation = sumAll(families, "kad_record_validation_total");
  out.kad.refresh = sumAll(families, "kad_refresh_total");
  out.kad.republish = sumAll(families, "kad_republish_total");
  out.kad.routingTablePeers = sumAll(families, "kad_routing_table_peers");
  out.kad.streamResets = sumAll(families, "kad_stream_reset_total");

  // ---- bitswap ----
  out.bitswap.wantlistAdds = sumAll(families, "bitswap_wantlist_adds_total");
  out.bitswap.wantlistCancels = sumAll(families, "bitswap_wantlist_cancels_total");
  out.bitswap.sessions = sumAll(families, "bitswap_sessions_total");
  out.bitswap.blocksSent = sumAll(families, "bitswap_blocks_sent_total");
  out.bitswap.blocksReceived = sumAll(families, "bitswap_blocks_received_total");
  out.bitswap.blockBytesSent = histogramAvg(families, "bitswap_block_sent_bytes");
  out.bitswap.blockBytesReceived = histogramAvg(families, "bitswap_block_received_bytes");
  out.bitswap.messagesSent = sumAll(families, "bitswap_message_sent_total");
  out.bitswap.messagesReceived = sumAll(families, "bitswap_message_received_total");
  out.bitswap.messageBytesReceived = histogramAvg(families, "bitswap_message_received_bytes");
  out.bitswap.providerQueries = sumAll(families, "bitswap_provider_queries_total");
  out.bitswap.providerQueriesFound = sumAll(families, "bitswap_provider_queries_found");

  // ---- discovery ----
  out.discovery.bootstrapConnects = sumAll(families, "discovery_bootstrap_connect_total");
  out.discovery.bootstrapAvgMs = histogramAvg(families, "discovery_bootstrap_connect_duration_ms");
  out.discovery.peersDiscovered = sumAll(families, "discovery_peer_discovered_total");
  out.discovery.peersLost = sumAll(families, "discovery_peer_lost_total");
  out.discovery.randomWalks = sumAll(families, "discovery_random_walk_total");
  out.discovery.peersPerWalk = histogramAvg(families, "discovery_random_walk_peers_found");

  // ---- ping ----
  out.ping.count = fam(families, "ping")?.samples.find((s) => s.name === "ping_count")?.value ?? 0;
  const pingSum = fam(families, "ping")?.samples.find((s) => s.name === "ping_sum")?.value ?? 0;
  out.ping.avgMs = out.ping.count > 0 ? pingSum / out.ping.count : 0;
  out.ping.failures = sumAll(families, "ping_failure_total");
  out.ping.buckets = histogramBuckets(families, "ping");

  // ---- relay ----
  out.relay.reservations = sumAll(families, "relay_reservation_total");
  out.relay.hops = sumAll(families, "relay_hop_total");
  out.relay.forwardedBytes = sumAll(families, "relay_data_forwarded_bytes_total");

  // ---- request/response ----
  out.requestResponse.requests = sumAll(families, "request_response_requests_total");
  out.requestResponse.avgLatencyMs = histogramAvg(families, "request_response_latency_ms");

  // ---- gossipsub ----
  out.gossipsub.published = sumAll(families, "gossipsub_publish_total");
  out.gossipsub.received = sumAll(families, "gossipsub_received_total");
  out.gossipsub.outBytes = histogramAvg(families, "gossipsub_publish_out_bytes");
  out.gossipsub.messageBytes = histogramAvg(families, "gossipsub_message_bytes");
  out.gossipsub.subscriptionChanges = sumAll(families, "gossipsub_subscription_changes_total");
  out.gossipsub.control = sumAll(families, "gossipsub_control_total");
  out.gossipsub.subopts = sumAll(families, "gossipsub_subopts_total");

  return out;
}
