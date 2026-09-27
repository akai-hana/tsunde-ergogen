// Preview generator: renders the two-half key layout and the PCB key-field
// outline to docs/*.png.
//
// Ergogen's built-in demo (points_lib.visualize) emits one outline rect per key
// as a single <g stroke="#000" fill="none"> group in mm-space. This grabs that
// SVG, recolours the stroke for the light/dark GitHub themes, and scales it onto
// a transparent 1600x685 canvas - no title, no background fill - so the PNG sits
// cleanly on either GitHub theme. In the same pass it also renders the `preview`
// reference outline: the sharp key-field boundary with the switch cutouts, i.e.
// the PCB outline that hugs the keys (deliberately excluding the round-cornered
// outer board outline and any component/footprint detail). If `magick`/`convert`
// is not installed the SVGs are still written; only the PNG step is skipped.
//
// Usage: node preview.js   (writes docs/layout-v2{,-dark}.{svg,png} and
//                                   docs/pcb{,-dark}.{svg,png})

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const ergogen = require('ergogen')

const CONFIG = 'config.yaml'
const OUT = 'docs'
const W = 1600
const H = 685
const PAD = 40

ergogen.inject('footprint', 'choc_v2', require('./footprints/choc_v2'))
ergogen.inject('footprint', 'pico', require('./footprints/pico'))
ergogen.inject('footprint', 'usb_c', require('./footprints/usb_c'))

// Recolour the exporter's hardcoded black stroke to the theme's line colour, so
// the preview stays legible on light and dark GitHub alike. The demo group sets
// both a stroke attribute and an inline style; both must be updated (style wins).
const recolour = (body, dark) => {
    const stroke = dark ? '#ffffff' : '#1a1c22'
    return body
        .replace(/stroke="#000"/g, `stroke="${stroke}"`)
        .replace(/stroke:#000/g, `stroke:${stroke}`)
}

// Same recolour, but for the engine-produced outline SVGs: it also forces a
// visible stroke width (the exporter emits 0.25mm) and drops
// vector-effect="non-scaling-stroke" so the line scales with our page transform
// instead of staying hairline-thin.
//
// The width must be UNITLESS: the outline's coordinates are in mm and buildPage
// wraps the body in scale(fit). Writing "0.35mm" there is parsed as an absolute
// length (0.35 * 3.78 px) and *then* scaled by fit, double-counting the mm and
// rasterising ~8px thick; a bare 0.35 is 0.35 user units (= 0.35mm in this
// space) and scales exactly once.
const restyle = (body, dark, width) => {
    const stroke = dark ? '#ffffff' : '#1a1c22'
    return recolour(body, dark)
        .replace(/stroke-width="[^"]*"/g, `stroke-width="${width}"`)
        .replace(/stroke-width:[^;"]*/g, `stroke-width:${width}`)
        .replace(/\s*vector-effect="non-scaling-stroke"/g, '')
}

// Strip the <svg> wrapper, recolour, scale to fit and centre onto a transparent
// W x H canvas. `style` transforms the inner body; returns the finished page svg.
const buildPage = (svg, style) => {
    const m = svg.match(/viewBox="([^"]+)"/)
    if (!m) throw new Error('unexpected svg: no viewBox')
    const [, , vw, vh] = m[1].split(/\s+/).map(Number)
    const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    const fit = Math.min((W - 2 * PAD) / vw, (H - 2 * PAD) / vh)
    const tx = (W - vw * fit) / 2
    const ty = (H - vh * fit) / 2
    const g = `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${fit.toFixed(4)})">${style(body)}</g>`
    return { page: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n  ${g}\n</svg>`, fit }
}

const main = async () => {
    const config = fs.readFileSync(CONFIG, 'utf8')
    const results = await ergogen.process(config, { debug: true, svg: true })
    const demo = results.demo && results.demo.svg
    if (!demo) throw new Error('ergogen produced no demo svg')

    fs.mkdirSync(OUT, { recursive: true })

    // --- key layout (one rect per key) ---
    const layoutPages = [false, true].map(dark =>
        buildPage(demo, body => recolour(body, dark)).page)
    const layoutSvgs = [path.join(OUT, 'layout-v2.svg'), path.join(OUT, 'layout-v2-dark.svg')]
    layoutPages.forEach((page, i) => fs.writeFileSync(layoutSvgs[i], page))
    console.log(`wrote ${layoutSvgs.join(' and ')}`)

    // --- PCB key-field outline ---
    // Uses the `preview` reference outline: the sharp key-field boundary (with the
    // switch cutouts) that hugs the keys. Deliberately NOT pcbedge/board (round
    // corners, outermost) and NOT any footprint/component geometry.
    const pcb = results.outlines && results.outlines.preview && results.outlines.preview.svg
    if (!pcb) throw new Error('ergogen produced no preview outline svg')
    const pcbSvgs = [path.join(OUT, 'pcb.svg'), path.join(OUT, 'pcb-dark.svg')]
    let pcbFit = 0
    ;[false, true].forEach((dark, i) => {
        const { page, fit } = buildPage(pcb, body => restyle(body, dark, 0.35))
        pcbFit = fit
        fs.writeFileSync(pcbSvgs[i], page)
    })
    console.log(`wrote ${pcbSvgs.join(' and ')} (key-field outline, fit ${pcbFit.toFixed(3)}, transparent bg)`)

    // rasterise via ImageMagick (librsvg delegate), keeping the alpha channel
    const has = bin => { try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return true } catch { return false } }
    const magick = ['magick', 'convert'].find(has)
    if (!magick) {
        console.log('no ImageMagick found; wrote SVG only (PNG step skipped)')
        return
    }
    const all = [
        [layoutSvgs[0], path.join(OUT, 'layout-v2.png')],
        [layoutSvgs[1], path.join(OUT, 'layout-v2-dark.png')],
        [pcbSvgs[0], path.join(OUT, 'pcb.png')],
        [pcbSvgs[1], path.join(OUT, 'pcb-dark.png')],
    ]
    for (const [svg, png] of all) {
        execFileSync(magick, ['-background', 'none', '-density', '96', svg, '-resize', `${W}x${H}`, png])
        console.log(`wrote ${png}`)
    }
}

main().catch(e => { console.error(e); process.exit(1) })
