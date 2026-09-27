// USB-C 2.0 receptacle, mid-mount horizontal, for the inter-half serial link.
//
// Geometry from KiCad's official footprint
// Connector_USB.pretty/USB_C_Receptacle_HRO_TYPE-C-31-M-12 (the HRO / krhro
// TYPE-C-31-M-12), so the pad geometry is the vendor reference rather than a
// guess. Pads are named for the USB-C standard:
//   VBUS  A4/A9/B4/B9   +5V
//   GND   A1/A12/B1/B12
//   D+    A6/B6
//   D-    A7/B7
//   CC1   A5,  CC2  B5   (5.1k Rd to GND each end in CAD, so a C-to-C cable
//                         enumerates; the link is serial, not USB protocol)
//   SBU1  A8,  SBU2  B8   (left unconnected)
//
// The inter-half link is a serial link (TX/RX/5V/GND) carried on the D+/D- and
// power pins of a standard C-to-C cable, NOT raw USB protocol: a stock Pico is
// a USB device only (RP2040 has no USB host), so it cannot drive the peer half
// as a USB host. This is the standard way to do a USB-C split link on Picocans.
//
// Params name the nets that matter for the link. GND and the CC/SBU pads are
// left to CAD (resistors / no-connects).

// x, y, pad-name, size-x, size-y, kind ('link' | 'gnd' | 'nc')
const PADS = [
  [-3.25, -4.045, 'A1',  0.6, 1.45, 'gnd'],
  [-3.25, -4.045, 'B12', 0.6, 1.45, 'gnd'],
  [-2.45, -4.045, 'A4',  0.6, 1.45, 'link'],
  [-2.45, -4.045, 'B9',  0.6, 1.45, 'link'],
  [-2.45, -4.045, 'VBC', 0.0, 0.0,  'skip'],  // placeholder, not emitted
  [-1.75, -4.045, 'B8',  0.3, 1.45, 'nc'],
  [-1.25, -4.045, 'A5',  0.3, 1.45, 'nc'],   // CC1
  [-0.75, -4.045, 'B7',  0.3, 1.45, 'link'],
  [-0.25, -4.045, 'A6',  0.3, 1.45, 'link'],
  [ 0.25, -4.045, 'A7',  0.3, 1.45, 'link'],
  [ 0.75, -4.045, 'B6',  0.3, 1.45, 'link'],
  [ 1.25, -4.045, 'A8',  0.3, 1.45, 'nc'],
  [ 1.75, -4.045, 'B5',  0.3, 1.45, 'nc'],   // CC2
  [ 2.45, -4.045, 'A9',  0.6, 1.45, 'link'],
  [ 2.45, -4.045, 'B4',  0.6, 1.45, 'link'],
  [ 3.25, -4.045, 'B1',  0.6, 1.45, 'gnd'],
  [ 3.25, -4.045, 'A12', 0.6, 1.45, 'gnd']
]

module.exports = {
  params: {
    designator: 'J',
    VBUS: { type: 'net', value: '5V' },
    DP: { type: 'net', value: 'D+' },
    DN: { type: 'net', value: 'D-' },
    GND: { type: 'net', value: 'GND' }
  },
  body: p => {
    const smd = PADS.filter(([, , , , , k]) => k !== 'skip').map(([x, y, name, sx, sy, kind]) => {
      let net = ''
      if (kind === 'gnd') net = p.GND
      else if (kind === 'link') {
        if (name === 'A4' || name === 'A9' || name === 'B4' || name === 'B9') net = p.VBUS
        else if (name === 'A6' || name === 'B6') net = p.DP
        else if (name === 'A7' || name === 'B7') net = p.DN
      }
      return `      (pad ${name} smd rect (at ${x} ${y}) (size ${sx} ${sy}) (layers F.Cu F.Paste F.Mask) ${net || ''})`
    }).join('\n')

    // shield / mechanical through-hole pads (S1), from the KiCad footprint
    const shield = [
      '      (pad S1 thru_hole oval (at 4.32 1.05) (size 1 1.6) (drill oval 0.6 1.2) (layers *.Cu *.Mask))',
      '      (pad S1 thru_hole oval (at -4.32 1.05) (size 1 1.6) (drill oval 0.6 1.2) (layers *.Cu *.Mask))',
      '      (pad S1 thru_hole oval (at -4.32 -3.13) (size 1 2.1) (drill oval 0.6 1.7) (layers *.Cu *.Mask))',
      '      (pad S1 thru_hole oval (at 4.32 -3.13) (size 1 2.1) (drill oval 0.6 1.7) (layers *.Cu *.Mask))',
      '      (pad "" np_thru_hole circle (at 2.89 -2.6) (size 0.65 0.65) (drill 0.65) (layers *.Cu *.Mask))',
      '      (pad "" np_thru_hole circle (at -2.89 -2.6) (size 0.65 0.65) (drill 0.65) (layers *.Cu *.Mask))'
    ].join('\n')

    return `
      (module USB_C_Receptacle (layer F.Cu) (tedit 5DD50112)
      ${p.at}

      ${'' /* footprint reference */}
      (fp_text reference "${p.ref}" (at 0 -5.645) (layer F.SilkS) ${p.ref_hide} (effects (font (size 1 1) (thickness 0.15))))
      (fp_text value "" (at 0 5.1) (layer F.SilkS) hide (effects (font (size 1 1) (thickness 0.15))))

      ${'' /* fab outline */}
      (fp_line (start 4.47 -3.65) (end 4.47 3.65) (layer F.Fab) (width 0.1))
      (fp_line (start -4.47 3.65) (end 4.47 3.65) (layer F.Fab) (width 0.1))
      (fp_line (start -4.47 -3.65) (end -4.47 3.65) (layer F.Fab) (width 0.1))
      (fp_line (start -4.47 -3.65) (end 4.47 -3.65) (layer F.Fab) (width 0.1))

${shield}

${smd}
      )
    `
  }
}
