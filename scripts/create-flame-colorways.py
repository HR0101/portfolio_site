"""Make colour variants from the approved RH Flame vector paths."""

from copy import deepcopy
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "docs/design/rh-flame"
WEB = ROOT / "public/brand"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
source = ET.parse(DESIGN / "RH-Flame.svg").getroot()

# Each list follows the approved gradient's original stop positions.
PALETTES = {
    "orange-blue": {
        "wing": ["#ff8229", "#ffad31", "#ff8b27", "#fc6726", "#e84925"],
        "crown": ["#ffd047", "#ff9027"],
        "stem": ["#47d6ff", "#1aa9ed", "#237bdd", "#164cae"],
        "right-stem": ["#2dbcf6", "#268ee7", "#256bd4", "#163da0"],
        "ribbon": ["#ff7727", "#ffb53d", "#57d3ef", "#235fc8"],
        "ribbon-light": ["#ffcf63", "#b5f0f5", "#479af2"],
        "r-leg": ["#ff972e", "#f15d26"],
    },
    "blue": {
        "wing": ["#46dfff", "#23bdf5", "#279aef", "#2975dc", "#18399e"],
        "crown": ["#9aeeff", "#36b9f5"],
        "stem": ["#65dcff", "#2aaff2", "#2474d7", "#183c9e"],
        "right-stem": ["#3da9f8", "#2789e4", "#205dc8", "#162f8b"],
        "ribbon": ["#1e83e3", "#36c2fa", "#4aa4f8", "#244bb9"],
        "ribbon-light": ["#7beaff", "#b0f3ff", "#5eacff"],
        "r-leg": ["#2da9f3", "#2561ce"],
    },
    "orange": {
        "wing": ["#ffb83e", "#ff9c29", "#ff7a20", "#f65c20", "#cb3a1c"],
        "crown": ["#ffe166", "#ffac32"],
        "stem": ["#ffc347", "#ff9828", "#f86a21", "#d7421c"],
        "right-stem": ["#ff9f30", "#ff8126", "#ee5a20", "#b83119"],
        "ribbon": ["#ff6e20", "#ff9e2e", "#f67d27", "#bc3e1b"],
        "ribbon-light": ["#ffd779", "#ffc24c", "#ff9f38"],
        "r-leg": ["#ff9a2b", "#ee5d20"],
    },
}


def recolour(palette):
    root = deepcopy(source)
    root.find(f"{{{NS}}}title").text = f"RH Flame — {palette}"
    for gradient in root.findall(f".//{{{NS}}}linearGradient"):
        stops = gradient.findall(f"{{{NS}}}stop")
        colours = PALETTES[palette][gradient.attrib["id"]]
        assert len(stops) == len(colours)
        for stop, colour in zip(stops, colours):
            stop.set("stop-color", colour)
    return root


def write(root, path):
    path.write_text(ET.tostring(root, encoding="unicode") + "\n")


for palette in PALETTES:
    root = recolour(palette)
    write(root, DESIGN / f"RH-Flame-{palette}.svg")
    write(root, WEB / f"rh-flame-{palette}.svg")
    dark = deepcopy(root)
    dark.insert(1, ET.Element(f"{{{NS}}}rect", width="400", height="200", fill="#031121"))
    write(dark, DESIGN / f"RH-Flame-{palette}-dark.svg")

board = ET.Element(f"{{{NS}}}svg", width="1280", height="510", viewBox="0 0 1280 510")
ET.SubElement(board, f"{{{NS}}}rect", width="1280", height="510", fill="#031121")


def label(text, x, y, size=14, fill="#b2c3d5", weight="400"):
    element = ET.SubElement(board, f"{{{NS}}}text", x=str(x), y=str(y),
                            fill=fill, attrib={"font-family": "Arial", "font-size": str(size), "font-weight": weight})
    element.text = text


label("RH / FLAME", 56, 60, 23, "#ffffff", "700")
label("COLOUR STUDIES", 1059, 59, 13)
ET.SubElement(board, f"{{{NS}}}path", d="M56 88H1224", stroke="#23364a", fill="none")
names = [("orange-blue", "01 / ORANGE + BLUE"), ("blue", "02 / BLUE"), ("orange", "03 / ORANGE")]
for index, (palette, title) in enumerate(names):
    x = 56 + index * 404
    label(title, x, 147, 13)
    root = recolour(palette)
    for node in root.iter():
        if "id" in node.attrib:
            node.set("id", f'{palette}-{node.attrib["id"]}')
        if node.attrib.get("fill", "").startswith("url(#"):
            node.set("fill", node.attrib["fill"].replace("url(#", f"url(#{palette}-"))
    root.attrib.update(x=str(x - 10), y="201", width="380", height="190")
    board.append(root)
ET.SubElement(board, f"{{{NS}}}path", d="M56 437H1224", stroke="#23364a", fill="none")
label("Same approved vector shapes · Editable gradients · Transparent standalone files", 56, 476, 13)
write(board, DESIGN / "RH-Flame-colourways.svg")
print("Created orange-blue, blue and orange variants without changing the approved geometry.")
