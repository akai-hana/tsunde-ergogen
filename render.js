// Render wrapper: runs ergogen over this repo's own bundle.
//
// config.yaml needs three footprints that are not ergogen built-ins (choc_v2,
// pico, usb_c), and `pcbs.*.footprints.*.what` is validated against the built-in
// list only, so they cannot be selected from config.yaml. Ergogen's answer to
// this is bundling: `config.yaml` at the root plus a `footprints/` folder
// alongside it, each .js registered under its path relative to `footprints/`.
// io.unpack() does that, and it is the same function the web UI runs on whatever
// you paste or import - cli.js even zips a folder in memory purely to reach it.
//
// So this script builds that same bundle instead of hand-injecting footprints.
// That keeps local output byte-identical to what ergogen.xyz produces from the
// repo URL, and it means a broken layout (config.yaml renamed, footprints
// folder moved or untracked) fails here first rather than only in the browser.
//
// Usage: npm run render -- [output_dir]

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const jszip = require('jszip')
const ergogen = require('ergogen')
const io = require('ergogen/src/io')
const { CSG } = require('@jscad/csg')
const stl = require('@jscad/stl-serializer')

const ROOT = __dirname
const CONFIG = 'config.yaml'
const OUTPUT = process.argv[2] || 'out'

// Mirror ergogen's own bundle layout: config at the root, plus every .js under
// footprints/ and templates/ (recursively, so a shared library can live in a
// subfolder and be referenced as `sub/name`).
const addDir = (zip, dir, prefix) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) addDir(zip, abs, prefix + entry.name + '/')
    else if (entry.name.endsWith('.js')) zip.file(prefix + entry.name, fs.createReadStream(abs))
  }
}

const buildBundle = async () => {
  const zip = new jszip()
  zip.file(CONFIG, fs.readFileSync(path.join(ROOT, CONFIG)))
  for (const folder of ['footprints', 'templates']) {
    const abs = path.join(ROOT, folder)
    if (fs.existsSync(abs)) addDir(zip, abs, folder + '/')
  }
  return zip
}

const dump = data => yaml.dump(data, { indent: 4, noRefs: true })

const write = (data, rel) => {
  if (!data) return
  const abs = path.join(OUTPUT, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, abs.endsWith('.yaml') ? dump(data) : data)
}

const writeComposite = (data, rel) => {
  if (!data) return
  if (data.yaml) write(data.yaml, rel + '.yaml')
  for (const format of ['svg', 'dxf', 'jscad']) {
    if (data[format]) write(data[format], rel + '.' + format)
  }
}

// Ergogen emits cases as JSCAD 1.0 (csg.js) scripts, not geometry. The ergogen
// web UI loads those with @jscad/csg and serializes the solid with
// @jscad/stl-serializer, so this pins the same two versions and evaluates the
// script the same way: the printed case is the same solid the browser previews.
//
// A generated script only reaches for `CSG` plus jscad's two free functions -
// every other operation (close, innerToCAG, extrude, union, subtract) is a
// method on Path2D/CAG/CSG. Angles are degrees and rotation happens about the
// part's own centre, which is what jscad 1.0's `rotate` did.
const toStl = script => {
  const rotate = (angles, object) => {
    const [x, y, z] = angles
    if (x) object = object.center().rotateX(x)
    if (y) object = object.center().rotateY(y)
    if (z) object = object.center().rotateZ(z)
    return object
  }
  const translate = (vector, object) => object.translate(vector)
  const solid = new Function('CSG', 'translate', 'rotate', script + '\nreturn main()')(
    CSG, translate, rotate)
  // the serializer returns [header, triangle count, data] as separate buffers
  return Buffer.concat(stl.serialize(solid, { binary: true }).map(chunk => Buffer.from(chunk)))
}

const main = async () => {
  const [config, injections] = await io.unpack(await buildBundle())

  console.log(`Analyzing bundle: ${injections.length} bundled file(s)`)
  for (const [type, name] of injections) console.log(`  ${type}  ${name}`)

  for (const [type, name, value] of injections) ergogen.inject(type, name, value)

  // debug: ergogen only fills in results.raw/canonical/units/points/demo when
  // asked, and only emits the `_`-prefixed intermediate outlines (the bay,
  // cavity, blank and port outlines the case is actually built from) in debug
  // mode. Without it the source/*.txt writes below are silently dead.
  const results = await ergogen.process(config, { debug: true }, s => console.log(s))

  fs.rmSync(OUTPUT, { recursive: true, force: true })
  fs.mkdirSync(OUTPUT, { recursive: true })

  write(results.raw, 'source/raw.txt')
  write(results.canonical, 'source/canonical.yaml')
  write(results.units, 'points/units.yaml')
  write(results.points, 'points/points.yaml')
  writeComposite(results.demo, 'points/demo')

  for (const [name, outline] of Object.entries(results.outlines)) {
    writeComposite(outline, `outlines/${name}`)
  }
  for (const [name, kase] of Object.entries(results.cases)) {
    writeComposite(kase, `cases/${name}`)
    if (kase.jscad) write(toStl(kase.jscad), `cases/${name}.stl`)
  }
  for (const [name, pcb] of Object.entries(results.pcbs)) {
    write(pcb, `pcbs/${name}.kicad_pcb`)
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
