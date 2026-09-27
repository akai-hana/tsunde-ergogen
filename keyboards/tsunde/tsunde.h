// tsunde - 42-key Chocofi-derived ergo split.
//
// Each half is a socketed RP2040 (Pico) driving 21 switches, one per GPIO, with
// the other switch leg on GND. There is no matrix scan and no diode: every key
// is an independent input. We express that to QMK as a 1x21 "virtual matrix" -
// 21 columns, one per switch pin, and a single dummy row pin that is driven but
// never read (the switches go to GND, not to the row). This reuses QMK's own
// matrix, debounce, NKRO and split code instead of a hand-rolled scanner.
//
// The two halves are electrically identical and physically mirrored, so the
// same firmware runs on both; the inter-half link is the hardware UART on
// GP0/GP1, carried over a USB-C cable on D+/D- (see the README - an RP2040 in
// device mode cannot be a USB host, so this is a serial link).
//
// Pin map (both halves; see config.yaml, pcbs.*.footprints.pico.params):
//   GP0/GP1   UART TX/RX, the split link
//   GP2-GP19  18 keywell keys, 6 columns x 3 rows
//   GP20-GP22 3 thumb keys
//   GP26      dummy row pin (unused)
//   GP27/GP28 free spares
#pragma once

#define MATRIX_ROWS 1
#define MATRIX_COLS 21

// The row is a dummy: the switches connect each column straight to GND, so the
// row pin is driven but its level is irrelevant to reading the columns.
#define MATRIX_ROW_PINS { GP26 }

// Column order is the physical arc, pinky_outer -> index_outer, then the three
// thumbs. It must match the keymap order below.
#define MATRIX_COL_PINS { \
    GP2,  GP3,  GP4,  /* pinky_outer: bottom, home, top */ \
    GP5,  GP6,  GP7,  /* pinky  : bottom, home, top */ \
    GP8,  GP9,  GP10, /* ring   : bottom, home, top */ \
    GP11, GP12, GP13, /* middle : bottom, home, top */ \
    GP14, GP15, GP16, /* index  : bottom, home, top */ \
    GP17, GP18, GP19, /* index_outer: bottom, home, top */ \
    GP20, GP21, GP22  /* thumbs t1, t2, t3 */ \
}

// No blocking, 21 independent keys.
#define NKRO_ENABLE yes

// Split: a plain hardware-UART link between the halves. Whichever half is
// plugged into the PC's USB becomes the master (RP2040 VBUS detect).
#define SERIAL_USART_ENABLE yes
#define SERIAL_USART_TX_PIN GP0
#define SERIAL_USART_RX_PIN GP1
#define SPLIT_USB_DETECT no
#define SPLIT_MAX_PACKET_SIZE 20

// 1ms USB polling keeps the split halves feeling like one keyboard.
#define USB_POLLING_INTERVAL_MS 1

// A single row of 21 keys, in the MATRIX_COL_PINS order above. Defined
// explicitly (rather than leaning on a generated ortho layout macro) so the
// keymap compiles as-is with no extra layout plumbing.
#define LAYOUT( \
    k01, k02, k03, k04, k05, k06, k07, k08, k09, k10, k11, \
    k12, k13, k14, k15, k16, k17, k18, k19, k20, k21) \
    { { k01, k02, k03, k04, k05, k06, k07, k08, k09, k10, k11, \
        k12, k13, k14, k15, k16, k17, k18, k19, k20, k21 } }
