#!/usr/bin/env node
// ============================================================
// CleanWear — PostHog Dashboard Creator
// Run: POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=... node scripts/create-posthog-dashboard.js
// ============================================================

const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error("Missing required env vars: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID");
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const url = `${POSTHOG_HOST}${path}`;
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

const DASHBOARD_NAME = "CleanWear Retention";

async function main() {
  // Step 1: Check if dashboard already exists
  console.log("Checking for existing dashboard...");
  const dashboards = await api("GET", `/api/projects/${PROJECT_ID}/dashboards/`);
  const existing = dashboards.results?.find((d) => d.name === DASHBOARD_NAME);
  if (existing) {
    console.log(`Dashboard already exists: ${POSTHOG_HOST}/project/${PROJECT_ID}/dashboard/${existing.id}`);
    return;
  }

  // Step 2: Create insights
  console.log("Creating insights...");

  // Insight 1: 7-Day Repeat Scanner Rate (Retention)
  const insight1 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "7-Day Repeat Scanner Rate",
    query: {
      kind: "RetentionQuery",
      retentionFilter: {
        retentionType: "retention_first_time",
        totalIntervals: 7,
        period: "Day",
        targetEntity: { id: "scan_completed", type: "events" },
        returningEntity: { id: "scan_completed", type: "events" },
      },
    },
  });
  console.log(`  ✓ Insight 1: ${insight1.name} (id: ${insight1.id})`);

  // Insight 2: Scan → Wardrobe Conversion (Funnel)
  const insight2 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Scan → Wardrobe Conversion",
    query: {
      kind: "FunnelsQuery",
      funnelsFilter: {
        funnelWindowInterval: 1,
        funnelWindowIntervalUnit: "day",
      },
      series: [
        { kind: "EventsNode", event: "scan_completed" },
        { kind: "EventsNode", event: "wardrobe_item_added" },
      ],
      dateRange: { date_from: "-30d" },
    },
  });
  console.log(`  ✓ Insight 2: ${insight2.name} (id: ${insight2.id})`);

  // Insight 3: Auth Conversion (Funnel)
  const insight3 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Auth Prompted → Signed Up",
    query: {
      kind: "FunnelsQuery",
      funnelsFilter: {
        funnelWindowInterval: 1,
        funnelWindowIntervalUnit: "hour",
      },
      series: [
        { kind: "EventsNode", event: "auth_prompted" },
        { kind: "EventsNode", event: "user_signed_up" },
      ],
      dateRange: { date_from: "-30d" },
    },
  });
  console.log(`  ✓ Insight 3: ${insight3.name} (id: ${insight3.id})`);

  // Insight 4: Daily Active Scanners (Trends)
  const insight4 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Daily Active Scanners",
    query: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "scan_completed",
          math: "dau",
        },
      ],
      dateRange: { date_from: "-30d" },
      interval: "day",
    },
  });
  console.log(`  ✓ Insight 4: ${insight4.name} (id: ${insight4.id})`);

  // Insight 5: Scans per User (Trends)
  const insight5 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Scans per User (7d avg)",
    query: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "scan_completed",
          math: "avg_count_per_actor",
        },
      ],
      dateRange: { date_from: "-30d" },
      interval: "week",
    },
  });
  console.log(`  ✓ Insight 5: ${insight5.name} (id: ${insight5.id})`);

  // Insight 6: Score Distribution (Trends breakdown)
  const insight6 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Score Band Distribution",
    query: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "scan_completed",
          math: "total",
        },
      ],
      breakdownFilter: {
        breakdowns: [{ property: "score_band", type: "event" }],
      },
      dateRange: { date_from: "-30d" },
      interval: "week",
    },
  });
  console.log(`  ✓ Insight 6: ${insight6.name} (id: ${insight6.id})`);

  // Insight 7: Top Scanned Products
  const insight7 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Top 10 Scanned Products",
    query: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "scan_completed",
          math: "total",
        },
      ],
      breakdownFilter: {
        breakdowns: [{ property: "product", type: "event" }],
        breakdown_limit: 10,
      },
      dateRange: { date_from: "-30d" },
    },
  });
  console.log(`  ✓ Insight 7: ${insight7.name} (id: ${insight7.id})`);

  // Insight 8: Scan Source Breakdown
  const insight8 = await api("POST", `/api/projects/${PROJECT_ID}/insights/`, {
    name: "Scan Source Breakdown",
    query: {
      kind: "TrendsQuery",
      series: [
        {
          kind: "EventsNode",
          event: "scan_started",
          math: "total",
        },
      ],
      breakdownFilter: {
        breakdowns: [{ property: "source", type: "event" }],
      },
      dateRange: { date_from: "-30d" },
    },
  });
  console.log(`  ✓ Insight 8: ${insight8.name} (id: ${insight8.id})`);

  // Step 3: Create dashboard with tiles
  console.log("Creating dashboard...");
  const dashboard = await api("POST", `/api/projects/${PROJECT_ID}/dashboards/`, {
    name: DASHBOARD_NAME,
    description: "CleanWear retention, conversion, and engagement metrics",
    tiles: [
      { insight: insight1.id, layouts: {} },
      { insight: insight2.id, layouts: {} },
      { insight: insight3.id, layouts: {} },
      { insight: insight4.id, layouts: {} },
      { insight: insight5.id, layouts: {} },
      { insight: insight6.id, layouts: {} },
      { insight: insight7.id, layouts: {} },
      { insight: insight8.id, layouts: {} },
    ],
  });

  const url = `${POSTHOG_HOST}/project/${PROJECT_ID}/dashboard/${dashboard.id}`;
  console.log(`\n✅ Dashboard created: ${url}`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
