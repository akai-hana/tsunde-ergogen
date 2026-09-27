// Socketed Raspberry Pi Pico (2x20), for a swappable module on a carrier PCB.
//
// Geometry from the official Pico datasheet:
//   - 40 pins, 2x20, 2.54mm pitch, 2 rows
//   - row-to-row centre spacing 17.78mm
//   - 1mm pin holes
//   - board 51 x 21mm, USB connector on one short edge (the pin 1 / pin 40 end)
//
// Pin numbering (USB at the top): pins 1-20 run down the left row, 21-40 run
// back up the right row. Pin 1 is top-left, pin 40 top-right.
//
// The 26 usable GPIOs on the header are GP0-GP22 and GP26-GP28 (GP23, GP24,
// GP25 and GP29 are not broken out; GP25 drives the onboard LED). Every GPIO
// pad is a `net` param, so config.yaml names them. Power/ground/RUN pads are
// fixed nets. Unassigned GPIO pads simply render with no net.
//
// The USB connector is a physical feature of the module (a USB-C on a Pico-C
// variant, micro-USB on a stock Pico); it is on the module's top edge, not on
// the carrier, so it needs a case cutout but no pad here. config.yaml places a
// usb_c receptacle separately for the inter-half serial link.

const PITCH = 2.54
const ROW = 17.78 / 2   // +/- from centre: two rows of 20 on 2.54mm pitch
const SPAN = 19 * PITCH / 2  // first pin to centre of the 20-pin row

// pin -> {name, kind}. kind: 'gpio' (net param) or a fixed net.
const PINS = {
  1: ['GP0', 'gpio'],   2: ['GP1', 'gpio'],   3: ['GND', 'GND'],
  4: ['GP2', 'gpio'],   5: ['GP3', 'gpio'],   6: ['GP4', 'gpio'],
  7: ['GP5', 'gpio'],   8: ['GND', 'GND'],
  9: ['GP6', 'gpio'],  10: ['GP7', 'gpio'],  11: ['GP8', 'gpio'],
 12: ['GP9', 'gpio'],  13: ['GND', 'GND'],
 14: ['GP10', 'gpio'], 15: ['GP11', 'gpio'], 16: ['GP12', 'gpio'],
 17: ['GP13', 'gpio'], 18: ['GND', 'GND'],
 19: ['GP14', 'gpio'], 20: ['GP15', 'gpio'],
 21: ['GP16', 'gpio'], 22: ['GP17', 'gpio'], 23: ['GND', 'GND'],
 24: ['GP18', 'gpio'], 25: ['GP19', 'gpio'], 26: ['GP20', 'gpio'],
 27: ['GP21', 'gpio'], 28: ['GND', 'GND'],
 29: ['GP22', 'gpio'], 30: ['RUN', 'RST'],
 31: ['GP26', 'gpio'], 32: ['GP27', 'gpio'], 33: ['AGND', 'GND'],
 34: ['GP28', 'gpio'], 35: ['ADC_VREF', 'GND'], 36: ['3V3', '3V3'],
 37: ['3V3_EN', '3V3'], 38: ['GND', 'GND'],
 39: ['VSYS', 'VCC'],  40: ['VBUS', '5V']
}

// geometry of one pad: x by row side, y by pin number
const pos = n => ({
  x: n <= 20 ? -ROW : ROW,
  y: n <= 20 ? -SPAN + (n - 1) * PITCH : SPAN - (n - 21) * PITCH
})

module.exports = {
  params: {
    designator: 'MCU',
    // fixed nets (overridable so the case can name the supply rail)
    '3V3': { type: 'net', value: '3V3' },
    VCC: { type: 'net', value: '5V' },
    GND: { type: 'net', value: 'GND' },
    RST: { type: 'net', value: 'RST' },
    // the 26 GPIOs
    ...Object.fromEntries(
      Object.entries(PINS)
        .filter(([, [, k]]) => k === 'gpio')
        .map(([, [name]]) => [name, { type: 'net', value: name }])
    )
  },
  body: p => {
    const pads = Object.entries(PINS).map(([n, [name, kind]]) => {
      const { x, y } = pos(+n)
      const net = kind === 'gpio' ? p[name] : (p[kind] !== undefined ? p[kind] : kind)
      return `      (pad ${n} thru_hole circle (at ${x} ${y}) (size 1.7 1.7) (drill 1) (layers *.Cu *.Mask) ${net || ''})`
    }).join('\n')

    return `
      (module Pico (layer F.Cu) (tedit 5DD50112)
      ${p.at}

      ${'' /* footprint reference */}
      (fp_text reference "${p.ref}" (at 0 0) (layer F.SilkS) ${p.ref_hide} (effects (font (size 1.27 1.27) (thickness 0.15))))
      (fp_text value "" (at 0 0) (layer F.SilkS) hide (effects (font (size 1.27 1.27) (thickness 0.15))))

      ${'' /* board outline 51 x 21, USB on the top edge */}
      (fp_line (start -10.5 -25.5) (end 10.5 -25.5) (layer F.Fab) (width 0.1))
      (fp_line (start 10.5 -25.5) (end 10.5 25.5) (layer F.Fab) (width 0.1))
      (fp_line (start 10.5 25.5) (end -10.5 25.5) (layer F.Fab) (width 0.1))
      (fp_line (start -10.5 25.5) (end -10.5 -25.5) (layer F.Fab) (width 0.1))

      ${'' /* pin 1 marker, top-left */}
      (fp_circle (center -ROW -SPAN) (end -ROW -SPAN - 0.5) (layer F.SilkS) (width 0.15))
      (fp_text user "USB" (at 0 -25.5) (layer F.SilkS) (effects (font (size 1 1) (thickness 0.15))))

${pads}
      )
    `
  }
}
