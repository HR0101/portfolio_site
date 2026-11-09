"""Build the RH hero asset with Blender, without external assets or add-ons.

Run from the repository root:
    blender --background --python scripts/create-rh-model.py
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models"
SOURCE = ROOT / "docs" / "design" / "rh-core"
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene


def material(name, color, metallic=0.0, roughness=0.3, coat=0.0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.22
    return result


ceramic = material("Porcelain · cool white", (0.79, 0.83, 0.90), roughness=0.28, coat=0.22)
silver = material("RH · satin silver", (0.39, 0.46, 0.58), metallic=0.78, roughness=0.25)

root = bpy.data.objects.new("RH_Core", None)
scene.collection.objects.link(root)
root["description"] = "Rounded porcelain core with separate, extruded silver RH letters."
root["web_axes"] = "glTF: +Y up, +Z front. Origin: center of the porcelain body."


def rounded_outline(half_size, radius, segments=16):
    points = []
    for corner in range(4):
        angle = corner * math.pi / 2
        center_x = (half_size - radius) * (1 if corner in (0, 3) else -1)
        center_y = (half_size - radius) * (1 if corner in (0, 1) else -1)
        for step in range(segments + 1):
            theta = angle + step / segments * math.pi / 2
            points.append((center_x + radius * math.cos(theta), center_y + radius * math.sin(theta)))
    return points


def make_body():
    half_size, radius, half_depth, bevel = 1.4, 0.60, 0.19, 0.105
    profiles = []
    for step in range(9):
        t = step / 8 * math.pi / 2
        profiles.append((bevel * (1 - math.sin(t)), -half_depth + bevel * (1 - math.cos(t))))
    for step in range(9):
        t = step / 8 * math.pi / 2
        profiles.append((bevel * (1 - math.cos(t)), half_depth - bevel + bevel * math.sin(t)))
    vertices = []
    for inset, depth in profiles:
        # Model directly in Blender's X/Z upright plane. glTF export maps the
        # front (-Y) to +Z, so no corrective rotation is needed in Three.js.
        vertices.extend((x, -depth, y) for x, y in rounded_outline(half_size - inset, radius - inset))
    ring = len(vertices) // len(profiles)
    faces = []
    faces.append(tuple(reversed(range(ring))))
    for layer in range(len(profiles) - 1):
        for point in range(ring):
            nxt = (point + 1) % ring
            faces.append((layer * ring + point, layer * ring + nxt, (layer + 1) * ring + nxt, (layer + 1) * ring + point))
    faces.append(tuple((len(profiles) - 1) * ring + point for point in range(ring)))
    mesh = bpy.data.meshes.new("Porcelain rounded-square geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Core_Porcelain", mesh)
    scene.collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(ceramic)
    for polygon in mesh.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return obj


body = make_body()

font_path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
font = bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
letters = []
for character in "RH":
    curve = bpy.data.curves.new(f"{character} extrusion", "FONT")
    curve.body = character
    if font:
        curve.font = font
    curve.size = 1.0
    curve.extrude = 0.043
    curve.bevel_depth = 0.012
    curve.bevel_resolution = 3
    curve.resolution_u = 12
    obj = bpy.data.objects.new(f"Letter_{character}", curve)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    letters.append(obj)

# Center using actual outline bounds rather than font metrics; keep the spacing
# and weight close to the existing RH mark in the hero.
scale = 1.02 / max(vertex.co.y for obj in letters for vertex in obj.data.vertices)
widths = [(max(v.co.x for v in obj.data.vertices) - min(v.co.x for v in obj.data.vertices)) * scale for obj in letters]
cursor = -(sum(widths) + 0.095) / 2
for obj, width in zip(letters, widths):
    minimum = min(v.co.x for v in obj.data.vertices)
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        vertex.co = ((x - minimum) * scale + cursor, -(0.19 + 0.043 * scale + 0.006 + z * scale), y * scale - 0.51)
    obj.data.update()
    obj.data.materials.append(silver)
    obj.parent = root
    cursor += width + 0.095


def export_glb(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_yup=True, export_apply=True, export_cameras=False,
        export_lights=False, export_animations=False, export_extras=True,
    )


export_glb(OUTPUT / "rh-core.glb", [root, body, *letters])
export_glb(OUTPUT / "rh-monogram.glb", [root, *letters])

# Studio objects exist only in the editable Blender file and the previews.
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.72, 0.78, 0.90, 1)
background.inputs["Strength"].default_value = 0.45
scene.view_settings.view_transform = "AgX"


def aim(obj, target=(0, 0, 0)):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, energy, size, color, shape="DISK", size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = shape
    data.size = size
    data.color = color
    if size_y is not None:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj)
    return obj


area("Key · large softbox", (-3.5, -4.5, 6), 600, 4.0, (1.0, 0.96, 0.91))
area("Fill · cool softbox", (4.5, -3, 1.5), 380, 3.0, (0.79, 0.87, 1.0))
area("Edge · overhead strip", (1.0, 1.5, 5), 750, 3.5, (1.0, 1.0, 1.0), "RECTANGLE", 1.0)
area("Front · reflection strip", (-1.5, -5, 0), 80, 2.5, (1, 1, 1), "RECTANGLE", 0.6)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -1.94))
floor = bpy.context.object
floor.name = "Studio floor · excluded from GLB"
floor.data.materials.append(material("Backdrop · mist", (0.76, 0.81, 0.89), roughness=0.75))

bpy.ops.object.camera_add(location=(3.0, -8.5, 3.5))
camera = bpy.context.object
camera.name = "Preview camera · excluded from GLB"
camera.data.type = "ORTHO"
camera.data.ortho_scale = 4.9
aim(camera, (0, 0, -0.1))
scene.camera = camera
root.rotation_euler[1] = math.radians(-12)
scene.render.filepath = str(OUTPUT / "rh-core-preview.png")
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "rh-core.blend"))
bpy.ops.render.render(write_still=True)

# A transparent front view makes it easy to reuse the asset as a poster/fallback.
floor.hide_render = True
root.rotation_euler[1] = 0
camera.location = (0, -9, 0)
camera.data.ortho_scale = 3.5
aim(camera)
scene.render.film_transparent = True
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.filepath = str(OUTPUT / "rh-core-front.png")
bpy.ops.render.render(write_still=True)

# The live Hero uses the letters alone, including while WebGL is loading.
body.hide_render = True
scene.render.filepath = str(OUTPUT / "rh-monogram-front.png")
bpy.ops.render.render(write_still=True)

manifest = {
    "asset": "RH Core",
    "format": "glTF 2.0 binary",
    "axes": {"up": "+Y", "front": "+Z"},
    "origin": "Center of the porcelain body; suitable as the orbit origin.",
    "bodyDimensions": [2.8, 2.8, 0.38],
    "nodes": ["RH_Core", "Core_Porcelain", "Letter_R", "Letter_H"],
    "files": {name: (OUTPUT / name).stat().st_size for name in ["rh-core.glb", "rh-monogram.glb"]},
    "textures": 0,
    "generator": "scripts/create-rh-model.py",
}
(SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
