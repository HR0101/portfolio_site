"""Create editable vector artwork for the RH Flight identity.

The SVG master is opened and saved as .ai in Adobe Illustrator.
Logo lettering is outlined; only specimen-board captions use live type.
"""

from pathlib import Path
from html import escape
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "brand"
DESIGN = ROOT / "docs" / "design" / "rh-flight"
ASSETS.mkdir(parents=True, exist_ok=True)
DESIGN.mkdir(parents=True, exist_ok=True)

INK = "#1d1d1f"
BLUE = "#396da9"

# One compound path: the R's diagonal is also the H's left leg. The upper
# contours form the wings, the crossbar becomes the body, and the right edge
# becomes the head. The second contour is the R counter (negative space).
FLIGHT = "M24 218C37 181 46 137 49 100C41 78 31 55 20 34C60 48 104 60 129 84C144 98 150 116 141 132L174 132C170 103 163 70 158 38C184 61 211 94 223 124C232 128 239 134 244 142L232 144C227 155 221 164 210 170C204 190 199 205 194 218L166 218C177 198 185 180 190 160L125 160C130 183 139 202 151 218L117 218C99 201 87 182 76 161L65 161C62 181 57 201 50 218Z M73 91L69 135C90 139 114 130 113 116C112 104 91 94 73 91Z"
R_FLIGHT = "M26 224C41 182 53 136 55 98L25 32C63 54 98 72 126 78C114 61 104 40 101 21C142 41 176 66 191 90C213 120 214 146 187 164C202 184 222 205 243 224L185 224C160 209 141 188 122 168L79 168C74 188 67 209 61 224Z M94 100L85 144C120 149 153 140 152 124C151 112 124 103 94 100Z"


def mark(ink=BLUE):
    return f'<path id="RH-flight-contour" fill="{ink}" fill-rule="evenodd" d="{FLIGHT}"/>'


def r_mark(ink=BLUE):
    return f'<path id="R-flight-contour" fill="{ink}" fill-rule="evenodd" d="{R_FLIGHT}"/>'


def svg(body, width, height, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{escape(label)}"><title>{escape(label)}</title>{body}</svg>\n'


font = TTFont("/System/Library/Fonts/Supplemental/Arial Bold.ttf")
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
units = font["head"].unitsPerEm


def outlined_text(text, x, baseline, size, color):
    parts = []
    cursor = 0
    for character in text:
        name = cmap[ord(character)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        parts.append(f'<path transform="translate({cursor} 0)" d="{pen.getCommands()}"/>')
        cursor += font["hmtx"][name][0]
    return f'<g fill="{color}" transform="translate({x} {baseline}) scale({size / units} {-size / units})">{"".join(parts)}</g>'


def caption(text, x, y, size=14, color="#737983", weight=400):
    return f'<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{escape(text)}</text>'


(ASSETS / "rh-flight.svg").write_text(svg(mark(), 256, 256, "Ryuto Hara — RH Flight"))
(DESIGN / "RH-Flight-symbol.svg").write_text(svg(mark(), 256, 256, "Ryuto Hara — RH Flight"))
(ASSETS / "rh-flight-mono.svg").write_text(svg(mark(INK), 256, 256, "Ryuto Hara — RH Flight, monochrome"))
(ASSETS / "rh-flight-white.svg").write_text(svg(mark("#fff"), 256, 256, "Ryuto Hara — RH Flight, white"))
(DESIGN / "RH-Flight-integrated-symbol.svg").write_text(svg(mark(), 256, 256, "Ryuto Hara — integrated RH"))
(DESIGN / "R-Flight-symbol.svg").write_text(svg(r_mark(), 256, 256, "Ryuto Hara — R Flight"))
for name, color in [("r-flight", BLUE), ("r-flight-mono", INK), ("r-flight-white", "#fff")]:
    (ASSETS / f"{name}.svg").write_text(svg(r_mark(color), 256, 256, "Ryuto Hara — R Flight"))

lockup = f'<g transform="translate(0 -1) scale(.3125)">{mark()}</g>'
lockup += outlined_text("Ryuto Hara", 100, 56, 45, INK)
(ASSETS / "rh-flight-wordmark.svg").write_text(svg(lockup, 355, 80, "Ryuto Hara"))

board = [
    '<rect width="1440" height="1040" fill="#fafaf8"/>',
    caption("RH / FLIGHT", 72, 66, 18, INK, 700),
    caption("Ryuto Hara · Visual identity", 1114, 66, 14),
    '<path d="M72 94H1368" fill="none" stroke="#dedfdf"/>',
    caption("01   PRIMARY SIGNATURE", 72, 140, 12),
    f'<g id="Primary-symbol" transform="translate(135 190) scale(1.35)">{mark()}</g>',
    '<g id="Horizontal-lockup" transform="translate(635 283)">',
    f'<g transform="scale(.45)">{mark()}</g>',
    outlined_text("Ryuto Hara", 134, 78, 59, INK),
    '</g>',
    caption("One contour. Shared strokes. RH in flight.", 636, 430, 17, INK),
    caption("The letterforms define the wings, body and head.", 636, 458, 15),
    '<path d="M72 568H1368" fill="none" stroke="#dedfdf"/>',
    caption("02   SINGLE COLOUR", 72, 608, 12),
    caption("03   REVERSED", 514, 608, 12),
    caption("04   AT SMALL SIZES", 1000, 608, 12),
    f'<g id="Monochrome" transform="translate(165 638) scale(.73)">{mark(INK)}</g>',
    '<rect x="514" y="634" width="390" height="225" rx="12" fill="#1d1d1f"/>',
    f'<g id="Reversed" transform="translate(616 650) scale(.73)">{mark("#fff")}</g>',
]
for x, size in [(1000, 24), (1060, 32), (1132, 48), (1226, 64)]:
    board.append(f'<g id="Size-{size}" transform="translate({x} {715 + (64-size)/2}) scale({size / 256})">{mark()}</g>')
    board.append(caption(f"{size}px", x, 809, 12))
board.extend([
    '<path d="M72 900H1368" fill="none" stroke="#dedfdf"/>',
    caption("COLOUR", 72, 946, 12),
    f'<rect x="160" y="927" width="24" height="24" rx="12" fill="{BLUE}"/>',
    caption("Flight blue   #396DA9", 196, 945, 14, INK),
    f'<rect x="424" y="927" width="24" height="24" rx="12" fill="{INK}"/>',
    caption("Graphite   #1D1D1F", 460, 945, 14, INK),
    caption("Original vector artwork · Transparent logo assets · Outlined lettering", 72, 995, 13),
    caption("2026", 1334, 995, 13),
])
(DESIGN / "RH-Flight-master.svg").write_text(svg("".join(board), 1440, 1040, "RH Flight — visual identity master"))
(DESIGN / "RH-Flight-integrated-master.svg").write_text(svg("".join(board), 1440, 1040, "RH Flight — integrated identity master"))

comparison = [
    '<rect width="1200" height="800" fill="#fafaf8"/>',
    caption("R / RH — FLIGHT STUDIES", 64, 58, 18, INK, 700),
    caption("Ryuto Hara", 1058, 58, 14),
    '<path d="M64 88H1136" fill="none" stroke="#dedfdf"/>',
    caption("01   R / WING", 64, 140, 13),
    caption("02   RH / SHARED STROKES", 664, 140, 13),
    f'<g id="R-single-contour" transform="translate(110 176) scale(1.45)">{r_mark()}</g>',
    f'<g id="RH-single-contour" transform="translate(710 176) scale(1.45)">{mark()}</g>',
    caption("The upper bowl becomes two swept wings.", 64, 570, 16, INK),
    caption("The diagonal leg continues into a tapered tail.", 64, 597, 14),
    caption("R and H share the diagonal and crossbar.", 664, 570, 16, INK),
    caption("The outer contour defines the bird in flight.", 664, 597, 14),
    '<path d="M64 628H1136" fill="none" stroke="#dedfdf"/>',
]
for offset, draw in [(64, r_mark), (664, mark)]:
    for x, size in [(0, 24), (70, 32), (150, 48), (250, 64)]:
        comparison.append(f'<g transform="translate({offset+x} {662+(64-size)/2}) scale({size/256})">{draw()}</g>')
        comparison.append(caption(f"{size}px", offset+x, 755, 12))
(DESIGN / "R-RH-comparison.svg").write_text(svg("".join(comparison), 1200, 800, "R and RH — single-contour flight studies"))
print(f"Vector master: {DESIGN / 'RH-Flight-master.svg'}")
