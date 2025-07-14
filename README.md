# Board Game Arena Userscripts

Userscripts to extend functionality on Board Game Arena ([BGA](http://boardgamearena.com)).

## List of Userscripts

### Pull Updates
**Force immediate update checks** on BGA. 

If your browser loses connection to the BGA server for an extended period (minutes or hours) - such as when your device (laptop, phone) enters sleep mode - you'll miss all game events during that time (including player actions).

This script automatically forces reconnection and resubscription to retrieve these missed events. It adds a status icon before to the sound toggle button in the game table's upper right corner:

 - Green: Active connection (receiving all events).
 - Gray: Disconnected from server.

Click the icon to manually force reconnection at any time.

Works with all games.

Install: [https://github.com/.../pull-updates.bga.user.js](https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/pull-updates.bga.user.js)

### Hide Friends Activity
**Hides non-participating friends' activity** in game logs.

This script solves the issue described in this [bug report](https://boardgamearena.com/bug?id=29258). It makes game logs cleaner and more focused by hiding events from players not participating in the current game - including 'online/offline' status changes from your friends list.

Works with all games.

Install: [https://github.com/.../hide-friends-activity.bga.user.js](https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/hide-friends-activity.bga.user.js)

### Can't Stop
**Enhanced statistics** for [Can't Stop](https://boardgamearena.com/gamepanel?game=cantstop).

This script enhances the game table with precise mathematical calculations:

1. **Probability Table**: Shows odds for lines 2-12 when rolling dice
2. **Decision Analytics**: Displays probability metrics during move selection:
   For example:
   ```
   Progresses on 10 and 5
   P(A)=94.06% E[X]=16.83 n_max=11
   P(⧡)=23.3%
   ```
- **P(A)**: Probability of maintaining progress (not losing chips)
- **E[X]**: Expected number of safe rolls before progress loss  
  _Represents the long-term average (mean) over infinite trials_  
  **Use case**: Long-term risk assessment ("Will I survive 20+ turns?")  
  **Value**: Optimizes repeated play strategies
- **n_max**: Roll count where progress loss probability exceeds 50%  
  _Represents the median survival threshold_  
  **Use case**: Short-term decision making ("Can I survive 3 more turns?")  
  **Value**: Critical for immediate risk evaluation
- **P(⧡)**: Probability to advance (only relevant with <3 chips placed)

_Note: P(⧡) = P(A) when all 3 chips are placed_

3. **Risk Visualization**: Adds a graphical scale showing:
- Current success probability (P(A))
- Risk thresholds (n_max, E[X])
- Roll counter (n) since last chip placement

_Example: After placing chips on 6-7-8 (n=0), each roll increments n toward risk thresholds_

All this data allows for more probability-informed gameplay.

Play the odds, not your nerves. Still hurts to lose? Maybe just a little less. :)

Install: [https://github.com/.../cantstop.bga.user.js](https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/cantstop.bga.user.js)

```
Additional: Key differences between n_max and E[X]
1. E[X] (Expected Value): Estimates the long-run average number of rolls you'll make before losing progress over many repeated turns.
2. n_max: Finds the maximum safe rolls for a single turn where the probability of making all those rolls without losing progress is greater than 50%.
3. Calculation of E[X]: E[X] = 1 / p_fail (uses the probability of failing on a single roll). For lines 6-7-8, p_fail ≈ 0.084, so E[X] ≈ 12.
4. Calculation of n_max: n_max = floor( ln(0.5) / ln(p_success) ) (uses the probability of succeeding on a single roll). For lines 6-7-8, p_success ≈ 0.916, so n_max = 7.
5. E[X] > n_max always holds. E[X] includes rare, very long sequences of success (luck) which pull the average up. n_max ignores these, focusing only on what's reliably safe (>50%) now.
6. E[X] ≈ 12 Interpretation: Over many games controlling lines 6-7-8, you'll lose progress on average around the 12th roll. This measures the inherent power of the lines.
7. n_max = 7 Interpretation: If you stop after exactly 7 rolls in your current turn, there's a ~54% chance you never lost progress during those rolls. It's a safe stopping point.
8. Strategic Use for E[X]: Helps choose which lines to claim. High E[X] lines (like 6-7-8) let you progress further on average than low E[X] lines (like 2-3-12).
9. Tactical Use for n_max: Tells you when to stop during your turn. Use it to minimize the risk of losing hard-earned progress, especially near victory.
10. Risk Profile: n_max is risk-averse (guarantees >50% chance of zero failure this turn). E[X] is optimistic (predicts long-term average, including lucky streaks).
11. Core Difference: E[X] tells you how long you'll likely last until failure. n_max tells you how far you can push safely (>50%) without failing at all.
12. Winning Play: Maximize long-term gains using E[X] to pick lines. Secure critical progress using n_max to decide when to bank your gains.
```

### Kingdom Builder
**Enhanced statistics** for [Kingdom Builder](https://boardgamearena.com/gamepanel?game=kingdombuilder).

This script enhances Kingdom Builder with three key features:

1. **Objective Tracking**
    - Real-time display of every player's current objective points
    - Color-coded progress indicators

2. **Settlement Terrain Analysis**
    - Counts terrains touched by your settlements
    - Visual warning for untouched terrains (e.g., "Desert: 0")
    - *Example: If Desert=0, you can jump to any Desert when drawing that card*

3. **Probabilistic Forecasting**
    - Calculates current terrain card probabilities
    - Tracks cards drawn by all players
    - Estimates remaining turns until game end  

Compatibility Note: This script currently supports only English and Russian game translations. Due to limitations in BGA's implementation, other languages lack sufficient metadata for universal script functionality.

Install: [https://github.com/.../kingdom-builder.bga.user.js](https://github.com/indvd00m/bga-userscripts/raw/refs/heads/master/kingdom-builder.bga.user.js)

## Installation

### Using Tampermonkey
1. Install the [Tampermonkey extension](https://www.tampermonkey.net/)
2. Click any installation link above

### Other Browsers
- Safari: [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887)
- Firefox: [Violentmonkey](https://violentmonkey.github.io/) or [Greasemonkey](https://www.greasespot.net/)

## Compatibility
**Tested in**:
- Safari (Desktop & Mobile)
- Chrome (Desktop)

**Should work** in other modern browsers (Firefox, Edge, etc.)

## Roadmap
Developed as a hobby project with **no fixed roadmap** or release guarantees.

## Reporting Issues
Report bugs and request features on our [GitHub Issues page](https://github.com/indvd00m/bga-userscripts/issues).

## Contributing
Contributions are welcome! Please follow this process:
1. Fork the repository
2. Create an issue describing your proposed change (if none exists)
3. Keep changes minimal and focused
4. Reference the issue in commit messages
5. Submit a pull request
6. Comment on the related issue about your solution

## License & Author

© 2025 David E. Veliev

Licensed under [Apache 2.0](LICENSE)