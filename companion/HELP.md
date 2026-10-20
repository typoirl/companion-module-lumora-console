## Lumora

Controls the [Lumora](https://github.com/typoirl/Lumora) lighting console over OSC, and shows what it's doing on your buttons: each executor's sequence name, live cue and level, lit keys, the masters, the encoder bar, the grand master and the command line.

### Setting up Lumora

In Lumora, open **Setup → Control → OSC** and press **Add line**.

**UDP** (most setups)

- **Other device (IP)**: the IP address of the computer running Companion.
- **In port**: the port Companion sends to (8000 by default; the same as *Lumora's in port* here).
- **Out port**: the port Lumora sends feedback to (9000 by default; the same as *Feedback port* here).
- Tick **Receive** and **Send**. Tick **Commands** too if you want to send whole command lines.

**TCP**: Lumora listens on the line's **In port** and sends feedback back on the same connection. Tick the same boxes; set *Protocol* here to TCP.

If the line has a **Prefix**, type the same prefix here.

### Settings

- **Lumora computer's IP address**, **Protocol**, **Lumora's in port**, **Feedback port** (UDP) and **Prefix**, as above.

### Actions

| Action | Does |
| --- | --- |
| Command line | Runs a command, as typed (`Group 1 At Full`, `Go Executor 201`, `Store Cue 5`). Variables work in it. Needs **Commands** on the line. |
| Key | Presses a command key: Go, Clear, Store, At, Thru, digits, Enter… |
| Executor: key | Presses an executor's key 1, 2 or 3: tap, or press and release (put Press on the button's down and Release on its up, so Flash works). |
| Executor: playback | Go, Go back, Pause, Off, On or Top. |
| Executor: set fader / move fader | Sets a fader, or moves it up or down from where it is (for knobs). |
| Cue: go to | Sends a sequence to a cue. |
| Group: select or set | Selects a group, or sets its intensity. |
| Fixtures: select | Selects fixtures, as typed after `Fixture`. |
| Fixture: intensity or attribute | Sets one fixture's intensity, or any attribute by name. |
| Preset: apply | Applies a preset from any pool to the selection. |
| Macro: run | Runs a macro. |
| Master | Tap tempo, its key, reset, or its fader. |
| Grand master, Grand master: move, Blackout | |
| Executor page | Next, previous, or a page. |
| Programmer fade | Sets the time programmer changes take, or toggles it. |
| Encoder: turn | Turns the encoder bar's encoders (for knobs and rotary buttons). |
| Undo or redo | Like Ctrl+Z and Ctrl+Y. |
| Custom OSC message | Any of Lumora's addresses, with values. |

Page **0** means the page Lumora is on.

### Feedbacks

Executor key lit, a cue is live, fader above a level, blackout on, grand master down, programmer fade on, and which page is showing.

### Variables

`page`, `command_line`, `grand_master`, `blackout`, `prog_fade`, `version`; for each master `master_1_name`, `master_1_value`, `master_1_fader`; for each executor on the current page `exec_201_name`, `exec_201_cue`, `exec_201_fader`, `exec_201_key1`; for the encoder bar `encoder_1_name` and `encoder_1_value`. Executors beyond 101–110, 201–210 and 301–310 get variables as soon as Lumora reports them.

### Presets

Executor keys (name and live cue on the button, lit like the console), Go, Back, Pause and Off for faders 201–210, faders and the grand master on knobs, the command keys, the masters, the page, programmer fade, blackout, and the encoders on knobs.
