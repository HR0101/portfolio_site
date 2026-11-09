"""Editable gradient vector artwork, drawn from the user's RH reference.

Open RH-Flame.svg in Illustrator and save as AI to retain editable paths
and native vector gradients. No bitmap tracing or embedded images are used.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "docs/design/rh-flame"
WEB = ROOT / "public/brand"
DESIGN.mkdir(parents=True, exist_ok=True)
WEB.mkdir(parents=True, exist_ok=True)

GRADIENTS = '''<defs>
  <linearGradient id="wing" gradientUnits="userSpaceOnUse" x1="64" y1="2" x2="116" y2="180">
    <stop offset="0" stop-color="#ef2251"/>
    <stop offset=".26" stop-color="#ff6833"/>
    <stop offset=".49" stop-color="#ff8b25"/>
    <stop offset=".69" stop-color="#ff4b25"/>
    <stop offset="1" stop-color="#ad0d92"/>
  </linearGradient>
  <linearGradient id="crown" gradientUnits="userSpaceOnUse" x1="129" y1="39" x2="180" y2="76">
    <stop stop-color="#ffab20"/><stop offset="1" stop-color="#ff7f24"/>
  </linearGradient>
  <linearGradient id="stem" gradientUnits="userSpaceOnUse" x1="249" y1="40" x2="215" y2="172">
    <stop stop-color="#ffad21"/><stop offset=".45" stop-color="#ff6b20"/>
    <stop offset=".78" stop-color="#f33437"/><stop offset="1" stop-color="#c01183"/>
  </linearGradient>
  <linearGradient id="right-stem" gradientUnits="userSpaceOnUse" x1="333" y1="41" x2="299" y2="172">
    <stop stop-color="#a91491"/><stop offset=".25" stop-color="#fa2e39"/>
    <stop offset=".63" stop-color="#ff4a2c"/><stop offset="1" stop-color="#b01c99"/>
  </linearGradient>
  <linearGradient id="ribbon" gradientUnits="userSpaceOnUse" x1="220" y1="143" x2="382" y2="48">
    <stop stop-color="#ff5421"/><stop offset=".43" stop-color="#ff6924"/>
    <stop offset=".75" stop-color="#d92963"/><stop offset="1" stop-color="#7d167e"/>
  </linearGradient>
  <linearGradient id="ribbon-light" gradientUnits="userSpaceOnUse" x1="231" y1="125" x2="373" y2="55">
    <stop stop-color="#ff9126"/><stop offset=".58" stop-color="#ff8233"/>
    <stop offset="1" stop-color="#bd208b"/>
  </linearGradient>
  <linearGradient id="r-leg" gradientUnits="userSpaceOnUse" x1="158" y1="136" x2="186" y2="174">
    <stop stop-color="#ff5723"/><stop offset="1" stop-color="#ff352c"/>
  </linearGradient>
</defs>'''

# The swept head/body also provides the R's bowl and diagonal. Feather cuts
# and the upper counter remain transparent, so the mark works on any surface.
PARTS = [
    ("R-upper-bowl", "crown", "M111 41C130 39 162 38 179 42C196 46 204 56 207 68L187 68C180 58 171 51 153 49C138 45 124 43 111 41Z"),
    ("R-diagonal", "r-leg", "M151 139L175 131L198 174H179C172 174 168 167 165 160Z"),
    ("H-upper-left", "stem", "M223 113L237 58C241 46 247 41 258 41H273L258 91C244 99 232 105 223 113Z"),
    ("H-lower-left", "stem", "M213 147C217 130 229 117 247 110L227 171H210Z"),
    ("H-upper-right", "right-stem", "M316 73L321 54C325 43 333 40 348 41L342 61C333 65 324 69 316 73Z"),
    ("H-lower-right", "right-stem", "M308 108L337 93L320 156C317 166 310 173 301 173H289Z"),
    ("R-wing-body-tail", "wing", "M18 2C28 22 63 37 114 48C129 51 140 59 146 70C153 84 162 85 175 72C184 63 192 66 199 71L216 77L203 80C193 87 188 100 177 111C165 124 149 128 133 132C113 139 98 153 85 181L95 146C81 153 61 158 43 160C81 144 101 131 112 112C118 101 116 98 103 97C67 95 37 82 24 58C48 73 81 81 110 83C68 74 34 58 17 31C46 49 81 60 110 64C59 51 25 31 18 2Z"),
    ("Lower-flight-feather", "wing", "M29 77C49 89 78 96 108 95C79 101 49 94 29 77Z"),
    ("H-flight-crossbar", "ribbon", "M214 165C213 144 218 124 237 112C258 99 292 89 322 77C351 66 373 56 386 46C366 72 339 90 311 104C280 119 249 129 232 142C223 150 218 157 214 165Z"),
    ("Crossbar-leading-edge", "ribbon-light", "M220 141C227 127 238 118 257 110C290 96 339 80 375 55C346 82 309 98 278 111C250 122 232 131 220 141Z"),
]


def artwork(mono=False):
    paths = []
    for name, gradient, path in PARTS:
        fill = "#ffffff" if mono else f"url(#{gradient})"
        paths.append(f'<path id="{name}" fill="{fill}" d="{path}"/>')
    return '<g id="RH-Flame">' + ''.join(paths) + '</g>'


def svg(body, title, width=400, height=200):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 400 200"><title>{title}</title>{GRADIENTS}{body}</svg>\n'


transparent = svg(artwork(), "RH Flame — swept bird monogram")
dark = svg('<rect width="400" height="200" fill="#031121"/>' + artwork(), "RH Flame — dark preview")
(DESIGN / "RH-Flame.svg").write_text(transparent)
(DESIGN / "RH-Flame-dark.svg").write_text(dark)
(WEB / "rh-flame.svg").write_text(transparent)
(WEB / "rh-flame-white.svg").write_text(svg(artwork(mono=True), "RH Flame — white"))
print(DESIGN / "RH-Flame.svg")
