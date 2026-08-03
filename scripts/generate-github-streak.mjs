/**
 * generate-github-streak.mjs
 *
 * Generates a local GitHub streak SVG using GitHub's GraphQL API.
 *
 * Required environment variables:
 *   GITHUB_USERNAME
 *   GH_TOKEN
 *
 * Output:
 *   assets/github-streak.svg
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const USERNAME = process.env.GITHUB_USERNAME;
const TOKEN = process.env.GH_TOKEN;

const OUT_PATH =
  process.env.OUT_PATH || "assets/github-streak.svg";

if (!USERNAME) {
  console.error("Missing GITHUB_USERNAME.");
  process.exit(1);
}

if (!TOKEN) {
  console.error("Missing GH_TOKEN.");
  process.exit(1);
}

// ============================================================
// GitHub GraphQL
// ============================================================

const QUERY = `
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions

        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

async function fetchCalendar(username) {
  /*
   * GitHub limits contributionsCollection to a one-year period.
   * Request approximately the previous year through today.
   */

  const now = new Date();

  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);

  const response = await fetch(
    "https://api.github.com/graphql",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "github-streak-card-generator",
      },

      body: JSON.stringify({
        query: QUERY,

        variables: {
          username,
          from: from.toISOString(),
          to: now.toISOString(),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub API failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(
      `GitHub GraphQL errors: ${JSON.stringify(json.errors)}`,
    );
  }

  const calendar =
    json?.data?.user?.contributionsCollection
      ?.contributionCalendar;

  if (!calendar) {
    throw new Error(
      `Could not retrieve contribution calendar for ${username}`,
    );
  }

  return calendar;
}

// ============================================================
// Statistics
// ============================================================

function computeStats(calendar) {
  const days = calendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({
      date: day.date,
      count: Number(day.contributionCount),
    }))
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date),
    );

  if (days.length === 0) {
    throw new Error("No GitHub contribution data found.");
  }

  // ----------------------------------------------------------
  // Total contributions
  // ----------------------------------------------------------

  const totalContributions =
    calendar.totalContributions;

  // ----------------------------------------------------------
  // Active contribution days
  // ----------------------------------------------------------

  const activeDates = new Set(
    days
      .filter((day) => day.count > 0)
      .map((day) => day.date),
  );

  // ----------------------------------------------------------
  // Longest streak
  // ----------------------------------------------------------

  let longestStreak = 0;
  let longestStart = null;
  let longestEnd = null;

  let run = 0;
  let runStart = null;

  for (const day of days) {
    if (day.count > 0) {
      if (run === 0) {
        runStart = day.date;
      }

      run++;

      if (run > longestStreak) {
        longestStreak = run;
        longestStart = runStart;
        longestEnd = day.date;
      }
    } else {
      run = 0;
      runStart = null;
    }
  }

  // ----------------------------------------------------------
  // Current streak
  // ----------------------------------------------------------

  const today = new Date();

  const todayString = today
    .toISOString()
    .slice(0, 10);

  const yesterday = new Date(today);

  yesterday.setUTCDate(
    yesterday.getUTCDate() - 1,
  );

  const yesterdayString = yesterday
    .toISOString()
    .slice(0, 10);

  /*
   * If today has contributions, start today.
   *
   * Otherwise start yesterday. This means the current streak
   * doesn't disappear simply because you haven't contributed
   * yet today.
   */

  let cursor;

  if (activeDates.has(todayString)) {
    cursor = new Date(`${todayString}T00:00:00Z`);
  } else if (activeDates.has(yesterdayString)) {
    cursor = new Date(
      `${yesterdayString}T00:00:00Z`,
    );
  } else {
    cursor = null;
  }

  let currentStreak = 0;
  let currentStart = null;
  let currentEnd = null;

  while (cursor) {
    const date = cursor
      .toISOString()
      .slice(0, 10);

    if (!activeDates.has(date)) {
      break;
    }

    if (!currentEnd) {
      currentEnd = date;
    }

    currentStart = date;
    currentStreak++;

    cursor.setUTCDate(
      cursor.getUTCDate() - 1,
    );
  }

  // ----------------------------------------------------------
  // Date formatting
  // ----------------------------------------------------------

  function formatShort(dateString) {
    if (!dateString) return "—";

    return new Date(
      `${dateString}T00:00:00Z`,
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      },
    );
  }

  function formatFull(dateString) {
    return new Date(
      `${dateString}T00:00:00Z`,
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      },
    );
  }

  const firstDate = days[0].date;

  return {
    totalContributions,

    totalRange:
      `${formatFull(firstDate)} - Present`,

    currentStreak,

    currentRange:
      currentStreak > 0
        ? `${formatShort(currentStart)} - ${formatShort(currentEnd)}`
        : "No active streak",

    longestStreak,

    longestRange:
      longestStreak > 0
        ? `${formatShort(longestStart)} - ${formatShort(longestEnd)}`
        : "—",
  };
}

// ============================================================
// SVG
// ============================================================

function renderSVG(stats) {
  const {
    totalContributions,
    totalRange,
    currentStreak,
    currentRange,
    longestStreak,
    longestRange,
  } = stats;

  /*
   * SAME dimensions as your updated LeetCode card.
   */

  const W = 495;
  const H = 195;

  return `
<svg
  width="${W}"
  height="${H}"
  viewBox="0 0 ${W} ${H}"
  xmlns="http://www.w3.org/2000/svg"
  font-family="'Segoe UI', Ubuntu, Sans-Serif"
>

<style>

  .bg {
    fill: #0d1117;
    stroke: #2a2f3a;
    stroke-width: 1;
  }

  .divider {
    stroke: #2a2f3a;
    stroke-width: 1;
  }

  .big-num {
    font-size: 30px;
    font-weight: 700;
  }

  .num-blue {
    fill: #58a6ff;
  }

  .label {
    font-size: 12px;
    fill: #ffffff;
    font-weight: 600;
  }

  .sub {
    font-size: 10px;
    fill: #7d8590;
  }

  .streak-label {
    font-size: 12px;
    fill: #39d9d9;
    font-weight: 700;
  }

  .ring {
    fill: none;
    stroke: #39d9d9;
    stroke-width: 5;
  }

  .streak-num {
    font-size: 25px;
    font-weight: 700;
    fill: #ffffff;
  }

</style>


<!-- ====================================================== -->
<!-- Background -->
<!-- ====================================================== -->

<rect
  x="1"
  y="1"
  width="${W - 2}"
  height="${H - 2}"
  rx="10"
  class="bg"
/>


<!-- ====================================================== -->
<!-- Dividers -->
<!-- ====================================================== -->

<line
  x1="${W / 3}"
  y1="27"
  x2="${W / 3}"
  y2="${H - 27}"
  class="divider"
/>

<line
  x1="${(2 * W) / 3}"
  y1="27"
  x2="${(2 * W) / 3}"
  y2="${H - 27}"
  class="divider"
/>


<!-- ====================================================== -->
<!-- Total Contributions -->
<!-- ====================================================== -->

<g transform="translate(${W / 6}, 0)">

  <text
    x="0"
    y="70"
    text-anchor="middle"
    class="big-num num-blue"
  >${totalContributions}</text>

  <text
    x="0"
    y="96"
    text-anchor="middle"
    class="label"
  >Total Contributions</text>

  <text
    x="0"
    y="116"
    text-anchor="middle"
    class="sub"
  >${totalRange}</text>

</g>


<!-- ====================================================== -->
<!-- Current Streak -->
<!-- ====================================================== -->

<g transform="translate(${W / 2}, 0)">

  <circle
    cx="0"
    cy="61"
    r="33"
    class="ring"
  />

  <text
    x="0"
    y="69"
    text-anchor="middle"
    class="streak-num"
  >${currentStreak}</text>

  <!-- Flame -->

  <path
    transform="translate(-9,23) scale(0.75)"
    fill="#39d9d9"
    d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-.8-2.7C18.6 7.9 20 10 20 13a8 8 0 1 1-14.9-4C6 6 9 5 12 2z"
  />

  <text
    x="0"
    y="116"
    text-anchor="middle"
    class="streak-label"
  >Current Streak</text>

  <text
    x="0"
    y="136"
    text-anchor="middle"
    class="sub"
  >${currentRange}</text>

</g>


<!-- ====================================================== -->
<!-- Longest Streak -->
<!-- ====================================================== -->

<g transform="translate(${(5 * W) / 6}, 0)">

  <text
    x="0"
    y="70"
    text-anchor="middle"
    class="big-num num-blue"
  >${longestStreak}</text>

  <text
    x="0"
    y="96"
    text-anchor="middle"
    class="label"
  >Longest Streak</text>

  <text
    x="0"
    y="116"
    text-anchor="middle"
    class="sub"
  >${longestRange}</text>

</g>

</svg>
`;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log(
    `Fetching GitHub contributions for ${USERNAME}...`,
  );

  const calendar =
    await fetchCalendar(USERNAME);

  const stats =
    computeStats(calendar);

  console.log(stats);

  const svg =
    renderSVG(stats);

  mkdirSync(
    dirname(OUT_PATH),
    {
      recursive: true,
    },
  );

  writeFileSync(
    OUT_PATH,
    svg,
    "utf-8",
  );

  console.log(
    `Wrote ${OUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
