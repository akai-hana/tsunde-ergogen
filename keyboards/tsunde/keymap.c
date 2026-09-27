// tsunde keymap.
//
// The halves are physically mirrored and electrically identical, so this one
// keymap is flashed to both. Columns run pinky_outer -> index_outer (then the
// thumbs), each with bottom / home / top - see tsunde.h for the matching
// MATRIX_COL_PINS.
//
// IMPORTANT - the base layer below is a straightforward QWERTY left hand. Since
// the right half is its mirror image, the same code produces the mirrored
// letter order on the right side. Finalise the right-hand letters (or add a
// per-side layer) to suit how you actually build and use the two halves; the
// matrixless + split plumbing underneath is what matters and is done.
#include "tsunde.h"

enum layers { _BASE, _FN };

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [_BASE] = LAYOUT(
        // pinky_outer   pinky           ring            middle          index           index_outer
        KC_Z,    KC_A,    KC_Q,    KC_X,    KC_S,    KC_W,    KC_C,    KC_D,    KC_E,
        KC_V,    KC_F,    KC_R,    KC_B,    KC_G,    KC_T,    KC_N,    KC_H,    KC_Y,
        // thumbs
        KC_SPC,  MO(_FN), MO(_FN)
    ),
    [_FN] = LAYOUT(
        KC_GRV,  KC_1,    KC_2,    KC_3,    KC_4,    KC_5,    KC_6,    KC_7,    KC_8,
        KC_9,    KC_0,    KC_MINS, KC_EQL,  KC_BSPC, KC_TAB,  KC_LCTL, KC_LSFT, KC_ENT,
        KC_SPC,  TRNS,    TRNS
    ),
};
