from __future__ import annotations

from pathlib import Path
from typing import Iterable

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

OUT = Path(__file__).resolve().parents[1] / "public" / "models" / "fitmate-bodybuilder-rig.glb"


def translation(x: float = 0, y: float = 0, z: float = 0) -> np.ndarray:
    return trimesh.transformations.translation_matrix([x, y, z])


def scale(x: float = 1, y: float = 1, z: float = 1) -> np.ndarray:
    return np.diag([x, y, z, 1.0])


def rotation_x(angle: float) -> np.ndarray:
    return trimesh.transformations.rotation_matrix(angle, [1, 0, 0])


def rotation_y(angle: float) -> np.ndarray:
    return trimesh.transformations.rotation_matrix(angle, [0, 1, 0])


def rotation_z(angle: float) -> np.ndarray:
    return trimesh.transformations.rotation_matrix(angle, [0, 0, 1])


def compose(*matrices: Iterable[np.ndarray]) -> np.ndarray:
    result = np.eye(4)
    for matrix in matrices:
        result = result @ matrix
    return result


SKIN = PBRMaterial(
    name="Bodybuilder Skin",
    baseColorFactor=[222, 172, 138, 255],
    metallicFactor=0.0,
    roughnessFactor=0.52,
)
SKIN_LIGHT = PBRMaterial(
    name="Bodybuilder Skin Highlight",
    baseColorFactor=[235, 190, 157, 255],
    metallicFactor=0.0,
    roughnessFactor=0.48,
)
SKIN_DARK = PBRMaterial(
    name="Bodybuilder Skin Shadow",
    baseColorFactor=[194, 139, 108, 255],
    metallicFactor=0.0,
    roughnessFactor=0.58,
)
BRIEFS = PBRMaterial(
    name="FitMate Briefs",
    baseColorFactor=[22, 28, 39, 255],
    metallicFactor=0.0,
    roughnessFactor=0.67,
)
ACCENT = PBRMaterial(
    name="FitMate Green Accent",
    baseColorFactor=[52, 211, 153, 255],
    metallicFactor=0.0,
    roughnessFactor=0.46,
)
EYE_WHITE = PBRMaterial(
    name="Eye White",
    baseColorFactor=[248, 250, 252, 255],
    metallicFactor=0.0,
    roughnessFactor=0.38,
)
EYE_DARK = PBRMaterial(
    name="Eye Dark",
    baseColorFactor=[20, 25, 31, 255],
    metallicFactor=0.0,
    roughnessFactor=0.42,
)


scene = trimesh.Scene()


def add_empty(name: str, parent: str, transform: np.ndarray) -> None:
    scene.graph.update(frame_to=name, frame_from=parent, matrix=transform)


def add_mesh(
    mesh: trimesh.Trimesh,
    node_name: str,
    parent: str,
    material: PBRMaterial,
    transform: np.ndarray | None = None,
) -> None:
    mesh = mesh.copy()
    mesh.visual.material = material
    scene.add_geometry(
        mesh,
        node_name=node_name,
        geom_name=f"{node_name}Geometry",
        parent_node_name=parent,
        transform=np.eye(4) if transform is None else transform,
    )


def ellipsoid(
    radii: tuple[float, float, float],
    count: tuple[int, int] = (32, 24),
) -> trimesh.Trimesh:
    mesh = trimesh.creation.uv_sphere(radius=1.0, count=count)
    mesh.apply_transform(scale(*radii))
    return mesh


def capsule_y(length: float, radius: float, count: tuple[int, int] = (24, 24)) -> trimesh.Trimesh:
    # Trimesh capsule points along +Z. Rotate it to local Y and place it below the joint pivot.
    mesh = trimesh.creation.capsule(height=max(length - 2 * radius, 0.01), radius=radius, count=count)
    mesh.apply_transform(rotation_x(np.pi / 2))
    mesh.apply_translation([0, -length / 2, 0])
    return mesh


def box(extents: tuple[float, float, float]) -> trimesh.Trimesh:
    return trimesh.creation.box(extents=extents)


# Rig pivots mirror the procedural FitMate skeleton so the existing calibrated
# exercise poses can drive this real GLB model without retargeting every clip.
add_empty("FitMateBodybuilderRig", "world", np.eye(4))
add_empty("Torso", "FitMateBodybuilderRig", translation(0, 2.12, 0))
add_empty("LeftShoulder", "Torso", translation(-0.78, 1.28, 0))
add_empty("LeftElbow", "LeftShoulder", translation(0, -0.84, 0))
add_empty("LeftHand", "LeftElbow", translation(0, -0.78, 0))
add_empty("RightShoulder", "Torso", translation(0.78, 1.28, 0))
add_empty("RightElbow", "RightShoulder", translation(0, -0.84, 0))
add_empty("RightHand", "RightElbow", translation(0, -0.78, 0))
add_empty("LeftHip", "FitMateBodybuilderRig", translation(-0.31, 2.0, 0))
add_empty("LeftKnee", "LeftHip", translation(0, -1.10, 0))
add_empty("LeftFoot", "LeftKnee", translation(0, -1.03, 0))
add_empty("RightHip", "FitMateBodybuilderRig", translation(0.31, 2.0, 0))
add_empty("RightKnee", "RightHip", translation(0, -1.10, 0))
add_empty("RightFoot", "RightKnee", translation(0, -1.03, 0))

# Pelvis and glutes.
add_mesh(ellipsoid((0.50, 0.42, 0.37)), "Pelvis", "FitMateBodybuilderRig", SKIN_DARK, translation(0, 2.08, 0))
for side in (-1, 1):
    add_mesh(
        ellipsoid((0.27, 0.30, 0.25)),
        f"Glute_{'L' if side < 0 else 'R'}",
        "FitMateBodybuilderRig",
        SKIN,
        translation(side * 0.22, 1.98, -0.21),
    )

# Fitted briefs: front, back, sides and green waistband.
add_mesh(box((0.98, 0.09, 0.60)), "BriefWaistband", "FitMateBodybuilderRig", ACCENT, translation(0, 2.24, 0))
add_mesh(box((0.48, 0.37, 0.18)), "BriefFront", "FitMateBodybuilderRig", BRIEFS, compose(translation(0, 1.98, 0.27), rotation_x(-0.11)))
add_mesh(box((0.56, 0.35, 0.15)), "BriefBack", "FitMateBodybuilderRig", BRIEFS, compose(translation(0, 2.01, -0.25), rotation_x(0.08)))
for side in (-1, 1):
    add_mesh(
        box((0.17, 0.23, 0.16)),
        f"BriefSide_{'L' if side < 0 else 'R'}",
        "FitMateBodybuilderRig",
        BRIEFS,
        compose(translation(side * 0.31, 2.02, 0.01), rotation_z(side * -0.25)),
    )

# Torso mass: V-taper base, pectorals, lats, traps, abs, obliques and serratus.
add_mesh(ellipsoid((0.64, 0.94, 0.45)), "TorsoBase", "Torso", SKIN, translation(0, 0.72, 0))
add_mesh(ellipsoid((0.40, 0.42, 0.30)), "UpperBack", "Torso", SKIN_DARK, translation(0, 0.96, -0.20))
for side in (-1, 1):
    tag = "L" if side < 0 else "R"
    add_mesh(ellipsoid((0.28, 0.20, 0.16)), f"Pectoral_{tag}", "Torso", SKIN_LIGHT, translation(side * 0.24, 0.98, 0.34))
    add_mesh(ellipsoid((0.24, 0.54, 0.24)), f"Lat_{tag}", "Torso", SKIN_DARK, compose(translation(side * 0.43, 0.68, -0.02), rotation_z(side * -0.08)))
    add_mesh(ellipsoid((0.11, 0.25, 0.10)), f"Oblique_{tag}", "Torso", SKIN_DARK, compose(translation(side * 0.24, 0.39, 0.27), rotation_z(side * -0.13)))
    add_mesh(ellipsoid((0.085, 0.20, 0.07)), f"Serratus_{tag}", "Torso", SKIN_LIGHT, compose(translation(side * 0.37, 0.68, 0.27), rotation_z(side * -0.18)))

for row, y in enumerate((0.64, 0.44, 0.24)):
    for side in (-1, 1):
        tag = "L" if side < 0 else "R"
        add_mesh(ellipsoid((0.09, 0.085, 0.055)), f"Ab_{row}_{tag}", "Torso", SKIN_LIGHT, translation(side * 0.095, y, 0.40))

add_mesh(ellipsoid((0.31, 0.18, 0.18)), "Trapezius", "Torso", SKIN_DARK, translation(0, 1.38, -0.02))
add_mesh(capsule_y(0.34, 0.19), "Neck", "Torso", SKIN_DARK, translation(0, 1.68, 0))

# Head and simplified facial structure based on the bald reference.
add_mesh(ellipsoid((0.29, 0.35, 0.29)), "Head", "Torso", SKIN, translation(0, 1.93, 0))
add_mesh(ellipsoid((0.28, 0.16, 0.27)), "Cranium", "Torso", SKIN_LIGHT, translation(0, 2.12, -0.02))
add_mesh(ellipsoid((0.25, 0.15, 0.24)), "Jaw", "Torso", SKIN_DARK, translation(0, 1.76, 0.01))
add_mesh(ellipsoid((0.05, 0.075, 0.055)), "Nose", "Torso", SKIN_DARK, translation(0, 1.92, 0.295))
for side in (-1, 1):
    tag = "L" if side < 0 else "R"
    add_mesh(ellipsoid((0.052, 0.033, 0.025)), f"EyeWhite_{tag}", "Torso", EYE_WHITE, translation(side * 0.105, 2.0, 0.277))
    add_mesh(ellipsoid((0.020, 0.020, 0.014)), f"Pupil_{tag}", "Torso", EYE_DARK, translation(side * 0.105, 2.0, 0.302))
    add_mesh(ellipsoid((0.055, 0.09, 0.035)), f"Ear_{tag}", "Torso", SKIN_DARK, translation(side * 0.30, 1.96, 0))
add_mesh(box((0.15, 0.025, 0.025)), "Mouth", "Torso", SKIN_DARK, translation(0, 1.80, 0.278))


def add_arm(side: int) -> None:
    tag = "L" if side < 0 else "R"
    shoulder = f"{'Left' if side < 0 else 'Right'}Shoulder"
    elbow = f"{'Left' if side < 0 else 'Right'}Elbow"
    hand = f"{'Left' if side < 0 else 'Right'}Hand"
    add_mesh(ellipsoid((0.29, 0.27, 0.27)), f"Deltoid_{tag}", shoulder, SKIN_LIGHT, translation(0, -0.02, 0))
    add_mesh(capsule_y(0.84, 0.18), f"UpperArm_{tag}", shoulder, SKIN, np.eye(4))
    add_mesh(ellipsoid((0.16, 0.24, 0.14)), f"Bicep_{tag}", shoulder, SKIN_LIGHT, translation(0, -0.30, 0.12))
    add_mesh(ellipsoid((0.15, 0.27, 0.13)), f"Tricep_{tag}", shoulder, SKIN_DARK, translation(0, -0.38, -0.10))
    add_mesh(ellipsoid((0.15, 0.13, 0.15)), f"ElbowJoint_{tag}", elbow, SKIN_DARK, np.eye(4))
    add_mesh(capsule_y(0.78, 0.15), f"Forearm_{tag}", elbow, SKIN, np.eye(4))
    add_mesh(ellipsoid((0.115, 0.23, 0.105)), f"ForearmFlexor_{tag}", elbow, SKIN_DARK, translation(0, -0.28, 0.07))
    add_mesh(ellipsoid((0.13, 0.17, 0.09)), f"Palm_{tag}", hand, SKIN, translation(0, -0.08, 0.03))
    for finger in range(4):
        add_mesh(
            capsule_y(0.23 - finger * 0.012, 0.025),
            f"Finger_{tag}_{finger}",
            hand,
            SKIN,
            translation(side * (0.065 - finger * 0.043), -0.11, 0.035),
        )
    add_mesh(
        capsule_y(0.18, 0.03),
        f"Thumb_{tag}",
        hand,
        SKIN,
        compose(translation(side * 0.12, -0.05, 0.04), rotation_z(side * -0.55)),
    )


def add_leg(side: int) -> None:
    tag = "L" if side < 0 else "R"
    hip = f"{'Left' if side < 0 else 'Right'}Hip"
    knee = f"{'Left' if side < 0 else 'Right'}Knee"
    foot = f"{'Left' if side < 0 else 'Right'}Foot"
    add_mesh(ellipsoid((0.24, 0.23, 0.23)), f"HipJoint_{tag}", hip, SKIN_DARK, np.eye(4))
    add_mesh(capsule_y(1.10, 0.235), f"Thigh_{tag}", hip, SKIN, np.eye(4))
    add_mesh(ellipsoid((0.20, 0.36, 0.18)), f"Quadriceps_{tag}", hip, SKIN_LIGHT, translation(0, -0.35, 0.13))
    add_mesh(ellipsoid((0.18, 0.35, 0.16)), f"Hamstring_{tag}", hip, SKIN_DARK, translation(0, -0.40, -0.12))
    add_mesh(ellipsoid((0.17, 0.15, 0.17)), f"KneeCap_{tag}", knee, SKIN_DARK, translation(0, 0, 0.10))
    add_mesh(capsule_y(1.03, 0.185), f"Shin_{tag}", knee, SKIN, np.eye(4))
    add_mesh(ellipsoid((0.145, 0.32, 0.14)), f"Calf_{tag}", knee, SKIN_DARK, translation(0, -0.39, -0.09))
    add_mesh(ellipsoid((0.16, 0.10, 0.31)), f"FootBase_{tag}", foot, SKIN, translation(0, -0.09, 0.22))
    add_mesh(ellipsoid((0.14, 0.075, 0.18)), f"ToeBox_{tag}", foot, SKIN_LIGHT, translation(0, -0.12, 0.47))


add_arm(-1)
add_arm(1)
add_leg(-1)
add_leg(1)

# Metadata helps the web app and future Blender retargeting workflows.
scene.metadata.update(
    {
        "asset": "FitMate Bodybuilder Rig",
        "version": "1.0.0",
        "units": "meters",
        "license": "Project asset generated for FitMate",
        "neutral_pose": "A-pose",
        "rig_nodes": [
            "FitMateBodybuilderRig",
            "Torso",
            "LeftShoulder",
            "LeftElbow",
            "LeftHand",
            "RightShoulder",
            "RightElbow",
            "RightHand",
            "LeftHip",
            "LeftKnee",
            "LeftFoot",
            "RightHip",
            "RightKnee",
            "RightFoot",
        ],
    }
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(scene.export(file_type="glb"))
print(f"Created {OUT} ({OUT.stat().st_size:,} bytes)")
print(f"Nodes: {len(scene.graph.nodes)} | Geometries: {len(scene.geometry)}")
