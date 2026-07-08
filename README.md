# Dynasty HQ

A College Football 26 *dynasty-recruiting* feel as an installable iPhone web app (PWA). No games to play — just the part you love: fill your board, spend your hours, fight off rival schools, sign your class, and watch your players (and your coach) develop over the years.

## Try it right now (on your PC)
1. Double-click `index.html` — it opens in your browser and works fully.
2. Name your school, set prestige, and start. Go to **Scout** → add prospects to your **Board** → spend hours (+5) → hit **Advance Week**.

> Your dynasty auto-saves in the browser (localStorage). Same browser = same save.

For the best local experience (and so the offline service worker registers), run a tiny local server in this folder instead:
```
python -m http.server 8000
```
then open `http://localhost:8000` in your browser.

## Put it on your iPhone home screen
The app needs to be served over a URL (not a file) for the home-screen install to work properly. Easiest free way:

1. Go to **https://app.netlify.com/drop** on your computer.
2. **Drag this whole `CFB_Dynasty_Mobile` folder** onto the page. You'll get a public URL in seconds (no account needed to start).
3. Open that URL in **Safari on your iPhone**.
4. Tap the **Share** button → **Add to Home Screen**.
5. Launch it from the icon — it runs full-screen like a native app, works offline, and saves your dynasty on the phone.

(GitHub Pages or Vercel work too if you prefer.)

## Recruiting (the heart of it)
- **Board** — live competition bars vs. rival schools, your pitch-fit grades, commitments, and losses.
- **Recruiting activities** — assign one pitch per recruit: **Connect on Social Media (5h)**, **DM the Player (10h)**, **Contact Friends & Family (25h)**, or **Send the House (50h)**. Your activity **carries over every week** automatically until you change it or the recruit signs/leaves.
- **Weekly hour budget** scales with your **program prestige** (like CFB 26): a 1★ program gets 240h/week, a 5★ gets 430h. The Recruiting Hours perk adds more.
- **JUCO prospects** — some recruits come from junior college and sign in as **Sophomore or Junior** standing (more ready, less ceiling).
- **Scout** — filter by position/stars (or **NEED**), reveal OVR/POT and **hidden gems**.

## Roster & scheme
- **Full starting roster** — you begin with a complete, playable ~85-man roster spread across seniors to freshmen.
- **Playbooks** — pick an **offensive** and **defensive** playbook (Air Raid, Pro Style, Flexbone, 4-3, 3-4, Nickel, 3-3-5…). Each has formations and sets your **ideal depth chart**, so the Roster screen shows **position needs** and prospects get a **NEED** tag.
- **85-man cap** — scholarship limit enforced; up to 25 signees per class.
- **Development & departures** — players develop season over season (Normal/Impact/Star/Elite), then **graduate, declare for the NFL Draft, or enter the transfer portal**.

## Coach & goals
- **Coach** — level up from XP, spend skill points on perks (more hours, better closing, gem-finding, player development…). Rename your school, **change playbooks**, and set your pitch grades under ⚙ Program & Playbooks.
- **Goals** — weekly + season XP objectives, just like the game.

## Make it yours
- Coach tab → **⚙ Program** → rename your school + coach and set your pitch grades. You can rename to a real school if you want.
- Tuning knobs live at the top of `app.js` (`BASE_HOURS`, `HOUR_RATE`, `SIGN_TARGET`, `WEEKS_PER_SEASON`) and in the perk/goal lists.
- Name pools, schools, positions, and motivations live in `data.js`.

## Preseason focus & batch recruiting (v0.10.4)
- **Preseason is now scout/scholarship only:** during the preseason week, influence actions (DM, F&F, Send the House, Sway) are hidden for you and the other schools — you spend your big preseason budget **evaluating players (Scout) and locking in offers (Scholarship)**. Influence recruiting begins in Week 1.
- **Scout All** and **Offer All** buttons on the Board run those actions across every eligible recruit at once, and each button **shows the total hours it will consume** so you can budget at a glance.

## Coach career & trophies (v0.10.3)
- The **Coach tab** now shows your **coaching career record** — overall, conference, **vs Top 25**, and **vs Top 10** — tracked automatically from every game (regular season, bowls, and playoff).
- A **trophy case** counts your **national titles, conference championships, and playoff appearances**. Go win some hardware.

## Roster tools, scholarships & presentation (v0.10.2)
- **Team Needs screen** (Roster tab): a "Projected Next Year" grid showing positional needs after your seniors graduate, plus returning players + your committed recruits — so you recruit for next year, not just now.
- **Redshirting:** freshmen who don't crack the two-deep are auto-redshirted for an extra year of eligibility, shown as **"(RS)"** next to their class (e.g., `SR (RS)`, `SO (RS)`).
- **Weekly recap + commit splash:** advancing a week now opens a recap — game result, coach XP earned, and a 🎉 splash when a recruit commits ("X committed to [school]!") — so weeks feel like events.
- **Scholarships:** you have **35 scholarship offers**. Adding a recruit to your board is *not* a scholarship — offering one is a separate 5-hour action that gives an interest boost, and **you must have offered a scholarship to sign a player**. Offers are auto-returned to your pool if a recruit locks you out.
- **Scouting reworked:** it no longer eats into a recruit's 50-hour influence pool — it's a separate 10-hour action (3 uses / 30h for a full report), and you can **scout prospects straight from the pool without adding them to your board**. Action buttons are now uniform size.

## Recruiting refinements (v0.10.1)
- **Flat, exact hours:** preseason/weekly recruiting hours are now exactly the prestige table (a 3★ Arizona gets 750/600, not 748). The Recruiting attribute was repurposed to a small influence multiplier instead of nudging your hour count.
- **Stack multiple actions per recruit** (up to **50 combined hours**): e.g. Social (5) + DM (10) + Contact F&F (25) = 40 on one recruit. "Send the House" (50) fills the cap by itself. Each recruit card shows your plan as `X/50h`.
- **Scouting costs hours now** — it's the **Scout** action (10h), not a free reveal. It reveals **progressively**: you learn a motivation per scout and get his exact OVR/POT, gem status, and 🔒 dealbreaker only after a **full report** (3 scouts for skill players, 4 for linemen). You *can* still recruit a player you haven't fully scouted — you just won't know his dealbreaker.
- *Coming in v0.11:* a full CFB-sized coach skill tree with archetypes, unique perk pools, and unlock requirements.

## Pipelines (v0.10)
- **Geographic recruiting pipelines** (deep-dive §6): every program has territory **tiers (T1–T5)**. Your home region is T5, and bigger programs carry a national footprint of extra regions — see them in Coach → 🏛 Program → Pipelines.
- **Texas, California & Florida are split into sub-regions** (Houston, DFW, Central TX…; SoCal, NorCal…; South FL, West FL…), so pipelines are geographically precise.
- **Home-field advantage:** a higher pipeline tier in a recruit's region gives a real **recruiting-influence boost** (up to +50% at T5 — enough to overcome hour disparities), and makes his **Close to Home** pitch grade high. Each recruit card shows his 📍 region and your tier there.
- **Pipelines strengthen** every time you sign a player from a region, so winning an area builds a lasting edge there — the small-school path to relevance.

## Recruiting overhaul (v0.9)
- **The recruiting funnel** (deep-dive §5): every prospect moves Open → Top 8 → Top 5 → Top 3 → Deciding, shown on their card. For **4★+ blue-chips, if you fall out of their Top 5 you get dropped** — so get on their board early and invest, or recruit your level.
- **Prestige-based hour table + Preseason:** recruiting hours follow an exact table by prestige (half-star granularity, 0.5★→5★). Each season opens with a **Preseason** week that grants your **larger preseason budget** (e.g., 1,250 hrs at 5★, 450 at 1★) to build your board before games start, then a **weekly budget** during the season (1,000 down to 350). Prestige can drift in half-stars, moving you between rows. Class size scales with your program (small schools sign ~10, blue bloods fill all 25).
- **Hidden motivations + dealbreakers:** a recruit's three motivations (and which one is his **🔒 dealbreaker**) are hidden until you **Scout** him. If your grade on his dealbreaker is too low, he won't sign with you…
- **…unless you Sway him:** the new **Sway** activity can add a fourth motivation you grade well, neutralizing a bad dealbreaker.
- **Recruiting Battles:** when two schools are neck-and-neck near commitment, a **⚔ BATTLE** flags and the recruit holds out until someone pulls clearly ahead — pour hours in to win it.

## School attributes & program building (v0.8)
- Your program now has **school attributes** (deep-dive §4): fixed ones (Program Tradition, Conference Prestige, Stadium Atmosphere, Academic Prestige, Campus Lifestyle) and dynamic ones you invest in (Athletic Facilities, Brand Exposure, Recruiting, Pro Potential), plus a derived Coach Prestige.
- **Attributes drive recruiting:** a recruit's pitch grades now come from your attributes (blue bloods grade A/B, rebuilds grade D/F), and **glamour positions (QB/RB/WR/CB/Edge) weight Brand Exposure** more heavily.
- **Program Builder** (Coach tab → 🏛 Program): spend **upgrade points** — earned by winning — on your dynamic attributes. Higher **Facilities** speed up player development; higher **Brand Exposure/Recruiting** boost recruiting hours and pull.
- **Prestige rises with success:** titles, playoff runs, and big seasons grow your prestige (and Program Tradition) over time — and **winning never lowers it** (the deep-dive's prestige-regression bug, designed out). Bad seasons can dip it.
- The offseason wrap-up shows your prestige change and points earned.

## Player development (v0.7)
- A real **XP-based development engine** drives offseason growth (deep-dive §8). Each player's growth comes from their **development trait** (Elite grows ~3× a Normal), **age** (freshmen develop ~2× faster than seniors), **position** (O-linemen develop faster, edge rushers slower), **playing time**, and **real in-game performance**.
- **Development traits can upgrade** over the offseason (Normal→Impact is common, Star→Elite is rare), boosted by youth, strong play, and your Player-Developer coach perk.
- Players **gain weight** in the offseason (young O-linemen bulk up most), shown on their profile.
- **Player profiles** (tap any roster player) now show OVR + skill **tier (1–20)**, weight, XP earned, and **season + career stat lines**.
- The offseason wrap-up includes a **Player Development — Top Risers** section with OVR jumps and trait upgrades.
- Deliberately designed out the deep-dive's known bugs: **XP always allocates** (no zero-XP screens) and there's **no position-change penalty**.
- *Deferred:* per-attribute ratings and manual-vs-auto progression (the −25% manual penalty) come once players carry an attribute breakdown rather than a single OVR.

## Postseason & awards (v0.6)
- The regular season now flows into a real **postseason**: **conference championship games** crown your league champ, then the **12-team College Football Playoff** runs (5 auto bids incl. the best Group-of-5 champ + 7 at-large, top-4 seeds get byes, first round → quarterfinals → semifinals → neutral-site title game). Non-playoff bowl-eligible teams get **bowl games**.
- A **national champion** is crowned each year; your own playoff run (or bowl) and final ranking show on the Hub and in the season wrap-up.
- **Awards:** a **Heisman** winner and **All-America** team are chosen from season stats, with a real **national stat leaderboard** (passing/rushing/receiving) — see Season → Playoff / Stats.
- New **Playoff** sub-tab in the Season screen shows the full bracket, the champion, and the awards.

## Season & games (v0.5)
- A full **season now plays around you**. The **Hub** tab shows this week's matchup; hitting **Advance plays the game and runs the recruiting week** together.
- **Box-score simulation** from team ratings (built from your roster + scheme + home field) produces realistic scores **and per-player stat lines** (passing/rushing/receiving, tackles/sacks/INTs) that accumulate into season and career stats.
- **Pick your out-of-conference games:** Season → Schedule → tap **Edit** on a non-conference week to choose any opponent (tougher slates help your CFP résumé).
- The **Season** tab has Schedule, conference **Standings**, a CFP-style **Top 25**, and team **stat leaders**. The whole league sims weekly, so records and rankings move.
- End of regular season crowns **conference champions**, gives you a final ranking and a bowl game, then rolls into Signing Day & the offseason.

## Real teams (v0.4)
- You now pick from all **134 real FBS programs** across 11 conferences at setup; prestige, colors, and conference come from the team. Recruiting battles are against **real schools**, weighted by prestige (blue bloods chase 5★s).
- Players carry **backgrounds** (hometown, high school) — tap a roster player to view their profile.
- A **parody-name layer** is built in: Coach → ⚙ Program & Playbooks → "Use parody names" swaps every school to an original name (for when you promote the app). One flag, no gameplay change.
- Note: real team **logos** aren't bundled (trademarks) — teams show a color-and-initials crest.
- To pick a real team, start a new dynasty (Coach → ⚙ → Start New Dynasty). Older saves still load.

## Files (modular as of v0.4)
- `index.html` — shell · `app.css` — styling
- `core.js` — namespace, RNG, versioned saves · `teams.js` — FBS teams + parody layer · `gamedata.js` — game data & generators · `app.js` — engine + UI
- `manifest.webmanifest` + `sw.js` + `icons/` — the PWA install/offline bits
- `ROADMAP.md` — the full phased plan
