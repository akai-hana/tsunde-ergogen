# tsunde firmware (QMK)

Matrixless RP2040 firmware for one tsunde half. Flash **the same** `.hex` to
both halves; whichever you plug into USB becomes the split master.

## Build

```sh
qmk compile -kb tsunde -km default -j4
```

Firmware lands in `.build/tsunde_tsunde_default.hex`. Both halves take the same
file. The master is chosen at runtime by USB VBUS detect, not by build flags.

## Wiring recap (per half)

| Signal | Pico pin | Notes |
|--------|----------|-------|
| 21 key inputs | `GP2`–`GP22` | one switch each, other leg to `GND`, internal pull-up |
| split link TX  | `GP0` | hardware UART, into the USB-C `D+` (`A6`/`B6`) |
| split link RX  | `GP1` | hardware UART, from the USB-C `D-` (`A7`/`B7`) |

No diodes, no matrix scan. A pressed switch pulls its pin low; QMK's internal
pull-ups read the rest as unpressed.

## Inter-half link

A plain **UART** link, not USB. An RP2040 in its own USB-device mode cannot act
as a USB host, so the two halves are wired as a serial link over a **straight
(non-crossed) USB-C cable**:

- Left half: `TX` on `D+`, `RX` on `D-`
- Right half: `TX` on `D-`, `RX` on `D+` (the PCB swaps them, see `config.yaml`)

The cable's like-for-like pins then cross `TX → RX` on each side. Connect the two
halves with the cable's `D+`→`D+` and `D-`→`D-` conductors as-is.

Two hardware notes that the firmware cannot fix:

- **CC resistors are not in the netlist.** Fit two **5.1 kΩ** Rd resistors
  (one per CC line) on each receptacle, or the halves will not enumerate as
  USB-C devices / sinks properly.
- **VBUS ownership is up to you.** The firmware expects the master half's USB
  to power it; the link's `5V` net is present on both halves, but decide which
  half sources VBUS and whether you need a diode or ideal-diode between halves.

## The base layer is a starting point

The two halves are **physically mirrored and electrically identical**, so the
single base layer in `keymap.c` is a QWERTY *left* hand. The right half shows the
mirrored letter order. Before you use this as-is, adjust the right-hand letters
(or add a per-side layer) to match how you actually build and use the pair. The
matrixless + split plumbing underneath is finished and is the part that matters.
