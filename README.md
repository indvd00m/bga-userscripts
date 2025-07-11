# Board Game Arena Userscripts

Userscripts to extend functionality on Board Game Arena ([BGA](http://boardgamearena.com)).

## List of Userscripts

### Pull Updates
**Force immediate update checks** on BGA. 

If your browser loses connection to the BGA server for an extended period (minutes or hours) - such as when your device (laptop, phone) enters sleep mode - you'll miss all game events during that time (including player actions).

This script automatically forces reconnection and resubscription to retrieve these missed events. It adds a status icon before to the sound toggle button in the game table's upper right corner:

🟢 Green: Active connection (receiving all events)
⚪ Gray: Disconnected from server

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
- **Safari**: [Userscripts app](https://apps.apple.com/us/app/userscripts/id1463298887)
- **Firefox**: [Violentmonkey](https://violentmonkey.github.io/) or [Greasemonkey](https://www.greasespot.net/)

## Compatibility
✅ **Tested in**:
- Safari (Desktop & Mobile)
- Chrome (Desktop)

⚠️ **Should work** in other modern browsers (Firefox, Edge, etc.)

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