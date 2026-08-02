import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from html import escape

USERNAME = "rohon97"

OUTPUT = Path("profile/leetcode-heatmap.svg")

# --------------------------------------------------
# COLORS
# --------------------------------------------------

BACKGROUND = "#0D1117"
EMPTY = "#161B22"

COLORS = [
    "#161B22",
    "#0E7490",
    "#0891B2",
    "#22D3EE",
    "#67E8F9",
]

TEXT = "#C9D1D9"

# --------------------------------------------------
# FETCH LEETCODE CALENDAR
# --------------------------------------------------

url = f"https://leetcode.com/graphql"

query = {
    "query": """
    query userProfileCalendar($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          submissionCalendar
        }
      }
    }
    """,
    "variables": {
        "username": USERNAME
    }
}

data = json.dumps(query).encode("utf-8")

request = urllib.request.Request(
    url,
    data=data,
    headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
)

with urllib.request.urlopen(request) as response:
    result = json.loads(response.read().decode())

calendar_string = result["data"]["matchedUser"]["userCalendar"]["submissionCalendar"]

calendar = json.loads(calendar_string)

# Convert timestamp -> date -> submission count

submissions = {}

for timestamp, count in calendar.items():
    date = datetime.fromtimestamp(
        int(timestamp),
        tz=timezone.utc
    ).date()

    submissions[date] = int(count)

# --------------------------------------------------
# DATE RANGE
# --------------------------------------------------

today = datetime.now(timezone.utc).date()

# GitHub-style calendar:
# Start from Sunday of the week containing one year ago.

one_year_ago = today - timedelta(days=364)

# Python:
# Monday = 0
# Sunday = 6

days_since_sunday = (one_year_ago.weekday() + 1) % 7

start_date = one_year_ago - timedelta(days=days_since_sunday)

# End at today. Do NOT generate future cells.

# --------------------------------------------------
# SVG SETTINGS
# --------------------------------------------------

CELL = 14
GAP = 4
STEP = CELL + GAP

LEFT = 20
TOP = 20
BOTTOM = 35
RIGHT = 20

# Calculate number of week columns dynamically.

total_days = (today - start_date).days + 1
weeks = (total_days + 6) // 7

WIDTH = LEFT + weeks * STEP + RIGHT
HEIGHT = TOP + 7 * STEP + BOTTOM

# --------------------------------------------------
# COLOR LEVEL
# --------------------------------------------------

def get_color(count):
    if count == 0:
        return COLORS[0]

    if count <= 2:
        return COLORS[1]

    if count <= 5:
        return COLORS[2]

    if count <= 10:
        return COLORS[3]

    return COLORS[4]

# --------------------------------------------------
# CREATE SVG
# --------------------------------------------------

svg = []

svg.append(
    f'<svg xmlns="http://www.w3.org/2000/svg" '
    f'width="{WIDTH}" height="{HEIGHT}" '
    f'viewBox="0 0 {WIDTH} {HEIGHT}">'
)

svg.append(
    f'<rect width="100%" height="100%" '
    f'fill="{BACKGROUND}" rx="6"/>'
)

# --------------------------------------------------
# CELLS
# --------------------------------------------------

for week in range(weeks):

    for day in range(7):

        current_date = start_date + timedelta(
            days=week * 7 + day
        )

        # Don't draw dates after today.

        if current_date > today:
            continue

        count = submissions.get(current_date, 0)

        x = LEFT + week * STEP
        y = TOP + day * STEP

        color = get_color(count)

        tooltip = (
            f"{count} submission"
            f"{'s' if count != 1 else ''} "
            f"on {current_date.isoformat()}"
        )

        svg.append(
            f'<rect '
            f'x="{x}" '
            f'y="{y}" '
            f'width="{CELL}" '
            f'height="{CELL}" '
            f'rx="3" '
            f'fill="{color}">'
            f'<title>{escape(tooltip)}</title>'
            f'</rect>'
        )

# --------------------------------------------------
# DATE LABELS
# --------------------------------------------------

start_label = start_date.strftime("%Y.%m.%d")
end_label = today.strftime("%Y.%m.%d")

label_y = HEIGHT - 10

svg.append(
    f'<text '
    f'x="{LEFT}" '
    f'y="{label_y}" '
    f'fill="{TEXT}" '
    f'font-family="JetBrains Mono, monospace" '
    f'font-size="13">'
    f'{start_label}'
    f'</text>'
)

svg.append(
    f'<text '
    f'x="{WIDTH - RIGHT}" '
    f'y="{label_y}" '
    f'text-anchor="end" '
    f'fill="{TEXT}" '
    f'font-family="JetBrains Mono, monospace" '
    f'font-size="13">'
    f'{end_label}'
    f'</text>'
)

svg.append("</svg>")

# --------------------------------------------------
# SAVE
# --------------------------------------------------

OUTPUT.parent.mkdir(parents=True, exist_ok=True)

OUTPUT.write_text(
    "\n".join(svg),
    encoding="utf-8"
)

print(f"Generated: {OUTPUT}")
print(f"Range: {start_date} -> {today}")
print(f"Weeks: {weeks}")
