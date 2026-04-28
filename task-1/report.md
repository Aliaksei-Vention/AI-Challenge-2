## Approach
I captured screenshots of the original layout and component placement, then anonymized any personal information. I used Grok to generate a structured visual description of the interface and used that as a reference to recreate the page with Copilot. After the initial implementation, I iterated on styling, responsive behavior, and UI details with GitHub Copilot prompts, and then refined the page logic in the same prompt-driven workflow.

## Tools 
Grok, Github Copilot

## Data handling 
I replaced the original leaderboard data with synthetic mock data while keeping the same functional structure used by the UI.

1. I removed personal/sensitive details and used neutral test identities, roles, and organizational unit labels.
2. I split the data into focused JSON sources to match component responsibilities:
	- people/ranking entities (name, role, department, avatar, year)
	- activity events (personId, category, icon, quarter, date, points)
	- comments and replies
	- filter options
3. I preserved stable IDs (for example personId links) so activities and comments can be mapped correctly to each person.
4. I recalculated leaderboard totals in code from activity records instead of hardcoding scores, then derived rank order from computed totals.
5. I added fallback behavior for missing optional fields (for example avatar fallback image) to keep rendering robust.
6. I kept realistic variation in categories, quarters, dates, and point values so filtering, sorting, podium generation, and expanded activity views behave like real production data.

This approach allowed the app to demonstrate the full original leaderboard logic and interactions without exposing original source data.