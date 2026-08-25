# The Kings' Race

A card-based horse race, played entirely with a deck of Bicycle-style playing cards on an 8×5 board. Four Kings — one per suit — race from the bottom row to the top, pushed forward by Aces and knocked back by Jokers. Built as a single-page, dependency-free web app with a dark casino-table look, smooth animations, and a live race log.

## How it works

- The board is 8 rows × 5 columns. The four Kings start on the bottom row, one per column (♠ ♦ ♣ ♥); the top row is the finish line.
- The last column holds the 4 Aces and the 2 Jokers, shuffled and dealt face-down, one per row in between.
- The rest of the deck (2–Q, all suits) is shuffled into the main deck. Cards are drawn one at a time: the suit drawn sends that King up one row.
- Whenever **all four Kings** have passed a given row, the hidden card in that row's column flips:
  - an **Ace** sends the matching King one row further;
  - a **Joker** sends both same-colored Kings one row back.
- First King to reach the top row wins.

## Modes

- **Vs Computer** — pick your King, the computer randomly picks another. The remaining two race unclaimed.
- **Play with Friends** — name up to 4 riders, one per suit, and race together on the same screen.

From the victory screen you can start a **New Race** (same mode and setup) or **Change Mode** to set up a different one.

## Features

- Fully automatic race with a shuffle animation, countdown, and a Race Log narrating every draw, move, and checkpoint.
- Pause/Resume at any time; the in-game rules panel (bottom-right) pauses the race automatically while open.
- A deck pile that visibly thins out and a discard pile that grows as the game progresses.
- Bicycle-style playing cards throughout — face cards use custom King/Queen/Jack/Joker artwork.


## License

Code is released under the MIT License (see `LICENSE`). The bundled font is free to use per its own license (see `assets/fonts/Card Characters/Card-Characters_Read_Me.pdf`) but may not be redistributed as a standalone font file.
