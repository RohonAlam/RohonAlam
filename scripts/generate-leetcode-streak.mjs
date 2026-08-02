/**
 * generate-leetcode-streak.mjs
 *
 * Fetches a public LeetCode user's submission calendar and renders an SVG
 * card showing Total Submissions / Current Streak / Longest Streak,
 * styled to match a GitHub-streak-stats-style dark card.
 *
 * IMPORTANT — please read before relying on this in CI:
 * This uses LeetCode's public (undocumented, unofficial) GraphQL endpoint
 * at https://leetcode.com/graphql, calling the `matchedUser.submissionCalendar`
 * field. This field is widely used by community projects (e.g. the
 * leetcode-stats-card family of tools), but LeetCode does not officially
 * document or guarantee this schema, and it has changed before without
 * notice. If this script starts failing, the first thing to check is
 * whether the field name/shape changed — inspect the Network tab on
 * https://leetcode.com/<username>/ to see the current query LeetCode's
 * own frontend sends.
 *
 * Usage:
 *   LEETCODE_USERNAME=rohon97 node scripts/generate-leetcode-streak.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const USERNAME = process.env.LEETCODE_USERNAME;
const OUT_PATH = process.env.OUT_PATH || "assets/leetcode-streak.svg";

if (!USERNAME) {
  console.error("Missing LEETCODE_USERNAME env var.");
  process.exit(1);
}

const QUERY = `
  query userProfileCalendar($username: String!) {
    matchedUser(username: $username) {
      userCalendar {
        submissionCalendar
      }
    }
  }
`;

async function fetchCalendar(username) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // A Referer header is commonly required by LeetCode's endpoint.
      Referer: `https://leetcode.com/${username}/`,
      "User-Agent": "Mozilla/5.0 (leetcode-streak-card-generator)",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { username },
    }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`LeetCode API returned errors: ${JSON.stringify(json.errors)}`);
  }

  const raw = json?.data?.matchedUser?.userCalendar?.submissionCalendar;
  if (!raw) {
    throw new Error(
      `Could not find submissionCalendar in response — the API shape may have changed. Raw response: ${JSON.stringify(
        json,
      )}`,
    );
  }

  // submissionCalendar is a JSON string like { "1710000000": 3, "1710086400": 1, ... }
  // keys are unix timestamps (seconds) at UTC midnight of each active day.
  return JSON.parse(raw);
}

function computeStats(calendar) {
  // calendar: { [unixSeconds: string]: submissionCount }
  const dayMs = 24 * 60 * 60 * 1000;

  // Normalize to a Set/Map of UTC-midnight day timestamps -> count
  const days = Object.entries(calendar)
    .map(([ts, count]) => ({ day: Math.floor((Number(ts) * 1000) / dayMs), count: Number(count) }))
    .sort((a, b) => a.day - b.day);

  if (days.length === 0) {
    return null;
  }

  const totalContributions = days.reduce((sum, d) => sum + d.count, 0);
  const firstDay = days[0].day;

  // Build a quick lookup of active days
  const activeDaySet = new Set(days.map((d) => d.day));

  // Longest streak: scan for the longest run of consecutive active days
  let longestStreak = 0;
  let longestStart = null;
  let longestEnd = null;
  let runStart = null;
  let prevDay = null;

  for (const { day } of days) {
    if (prevDay !== null && day === prevDay + 1) {
      // continues the run
    } else {
      runStart = day;
    }
    const runLength = day - runStart + 1;
    if (runLength > longestStreak) {
      longestStreak = runLength;
      longestStart = runStart;
      longestEnd = day;
    }
    prevDay = day;
  }

  // Current streak: walk backward from today (UTC) while consecutive days are active.
  // Allow "today" to be missing (streak counted through yesterday) since today may
  // not have a submission yet.
  const todayDay = Math.floor(Date.now() / dayMs);
  let cursor = activeDaySet.has(todayDay) ? todayDay : todayDay - 1;
  let currentStreak = 0;
  let currentEnd = null;

  if (activeDaySet.has(cursor)) {
    currentEnd = cursor;
    while (activeDaySet.has(cursor)) {
      currentStreak++;
      cursor--;
    }
  }
  const currentStart = currentEnd !== null ? currentEnd - currentStreak + 1 : null;

  const fmt = (dayNum) =>
    new Date(dayNum * dayMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtShort = (dayNum) => new Date(dayNum * dayMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    totalContributions,
    totalRange: `${fmt(firstDay)} - Present`,
    currentStreak,
    currentRange:
      currentStreak > 0 ? `${fmtShort(currentStart)} - ${fmtShort(currentEnd)}` : "No active streak",
    longestStreak,
    longestRange: `${fmtShort(longestStart)} - ${fmtShort(longestEnd)}`,
  };
}

function renderSVG(stats, username) {
  const { totalContributions, totalRange, currentStreak, currentRange, longestStreak, longestRange } = stats;

  const W = 560;
  const H = 200;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="'Segoe UI', Ubuntu, Sans-Serif">
  <style>
    .bg { fill: #0d1117; stroke: #2a2f3a; stroke-width: 1; }
    .divider { stroke: #2a2f3a; stroke-width: 1; }
    .big-num { font-size: 32px; font-weight: 700; }
    .num-blue { fill: #58a6ff; }
    .label { font-size: 13px; fill: #ffffff; font-weight: 600; }
    .sub { font-size: 11px; fill: #7d8590; }
    .streak-label { font-size: 13px; fill: #39d9d9; font-weight: 700; }
    .ring { fill: none; stroke: #39d9d9; stroke-width: 5; }
    .streak-num { font-size: 26px; font-weight: 700; fill: #ffffff; }
  </style>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" class="bg"/>

  <!-- dividers -->
  <line x1="${W / 3}" y1="28" x2="${W / 3}" y2="${H - 28}" class="divider"/>
  <line x1="${(2 * W) / 3}" y1="28" x2="${(2 * W) / 3}" y2="${H - 28}" class="divider"/>

  <!-- Total contributions -->
  <g transform="translate(${W / 6}, 0)">
    <text x="0" y="72" text-anchor="middle" class="big-num num-blue">${totalContributions}</text>
    <text x="0" y="98" text-anchor="middle" class="label">Total Submissions</text>
    <text x="0" y="118" text-anchor="middle" class="sub">${totalRange}</text>
  </g>

  <!-- Current streak -->
  <g transform="translate(${W / 2}, 0)">
    <circle cx="0" cy="62" r="34" class="ring"/>
    <text x="0" y="70" text-anchor="middle" class="streak-num">${currentStreak}</text>
    <path transform="translate(-9,24) scale(0.75)" fill="#39d9d9" d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-.8-2.7C18.6 7.9 20 10 20 13a8 8 0 1 1-14.9-4C6 6 9 5 12 2z"/>
    <text x="0" y="118" text-anchor="middle" class="streak-label">Current Streak</text>
    <text x="0" y="138" text-anchor="middle" class="sub">${currentRange}</text>
  </g>

  <!-- Longest streak -->
  <g transform="translate(${(5 * W) / 6}, 0)">
    <text x="0" y="72" text-anchor="middle" class="big-num num-blue">${longestStreak}</text>
    <text x="0" y="98" text-anchor="middle" class="label">Longest Streak</text>
    <text x="0" y="118" text-anchor="middle" class="sub">${longestRange}</text>
  </g>
</svg>`;
}

async function main() {
  const calendar = await fetchCalendar(USERNAME);
  const stats = computeStats(calendar);
  if (!stats) {
    throw new Error("No submission data found for this user.");
  }
  const svg = renderSVG(stats, USERNAME);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, svg, "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
  console.log(stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
