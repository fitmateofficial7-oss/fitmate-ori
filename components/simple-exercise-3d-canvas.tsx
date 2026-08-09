"use client";

import { useEffect, useRef } from "react";

import {
  getExercise3DScene,
  type Equipment3D,
  type HumanoidPose3D,
  type Vec3,
} from "@/lib/exercise-3d-motion";
import type { ExerciseGuidePreset } from "@/lib/exercise-guides";

type Exercise3DCanvasProps = {
  preset: ExerciseGuidePreset;
  mode: "animation" | "start" | "finish";
  playing: boolean;
  cameraView: "front" | "side" | "back";
  cameraRevision: number;
  language: "id" | "en";
  exerciseName: string;
};

type Mat4 = Float32Array;
type Mesh = {
  position: WebGLBuffer;
  normal: WebGLBuffer;
  index: WebGLBuffer;
  count: number;
};

type Renderer = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  positionLocation: number;
  normalLocation: number;
  modelLocation: WebGLUniformLocation;
  viewProjectionLocation: WebGLUniformLocation;
  colorLocation: WebGLUniformLocation;
  lightLocation: WebGLUniformLocation;
  meshes: {
    sphere: Mesh;
    cylinder: Mesh;
    box: Mesh;
  };
};

const COLORS = {
  skin: [0.86, 0.64, 0.46, 1] as const,
  shirt: [0.08, 0.63, 0.44, 1] as const,
  shirtDark: [0.04, 0.43, 0.31, 1] as const,
  shorts: [0.08, 0.13, 0.2, 1] as const,
  shoes: [0.05, 0.08, 0.12, 1] as const,
  equipment: [0.2, 0.27, 0.34, 1] as const,
  equipmentLight: [0.48, 0.58, 0.65, 1] as const,
  accent: [0.12, 0.78, 0.56, 1] as const,
  pad: [0.09, 0.2, 0.26, 1] as const,
  floor: [0.8, 0.94, 0.88, 1] as const,
  eye: [0.02, 0.03, 0.04, 1] as const,
};

function mat4Identity(): Mat4 {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function mat4Translation(x: number, y: number, z: number): Mat4 {
  const out = mat4Identity();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

function mat4Scale(x: number, y: number, z: number): Mat4 {
  const out = mat4Identity();
  out[0] = x;
  out[5] = y;
  out[10] = z;
  return out;
}

function mat4RotateX(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotateY(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

function mat4RotateZ(angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function mat4Perspective(
  fieldOfView: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
  const f = 1 / Math.tan(fieldOfView / 2);
  const rangeInverse = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInverse, -1,
    0, 0, near * far * rangeInverse * 2, 0,
  ]);
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVector(value: Vec3, scale: number): Vec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

function vectorLength(value: Vec3) {
  return Math.hypot(value[0], value[1], value[2]);
}

function normalize(value: Vec3): Vec3 {
  const length = vectorLength(value) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const zAxis = normalize(subtract(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ]);
}

function matrixFromBasis(
  xAxis: Vec3,
  yAxis: Vec3,
  zAxis: Vec3,
  position: Vec3
): Mat4 {
  return new Float32Array([
    xAxis[0], xAxis[1], xAxis[2], 0,
    yAxis[0], yAxis[1], yAxis[2], 0,
    zAxis[0], zAxis[1], zAxis[2], 0,
    position[0], position[1], position[2], 1,
  ]);
}

function modelBetween(start: Vec3, finish: Vec3, radius: number): Mat4 {
  const direction = subtract(finish, start);
  const length = Math.max(0.0001, vectorLength(direction));
  const yAxis = normalize(direction);
  const helper: Vec3 = Math.abs(yAxis[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
  const xAxis = normalize(cross(helper, yAxis));
  const zAxis = normalize(cross(yAxis, xAxis));
  const midpoint = scaleVector(add(start, finish), 0.5);
  return mat4Multiply(
    matrixFromBasis(xAxis, yAxis, zAxis, midpoint),
    mat4Scale(radius, length / 2, radius)
  );
}

function modelBox(
  center: Vec3,
  size: Vec3,
  rotation: Vec3 = [0, 0, 0]
): Mat4 {
  let model = mat4Translation(center[0], center[1], center[2]);
  model = mat4Multiply(model, mat4RotateY(rotation[1]));
  model = mat4Multiply(model, mat4RotateX(rotation[0]));
  model = mat4Multiply(model, mat4RotateZ(rotation[2]));
  return mat4Multiply(model, mat4Scale(size[0] / 2, size[1] / 2, size[2] / 2));
}

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    `
      attribute vec3 a_position;
      attribute vec3 a_normal;
      uniform mat4 u_model;
      uniform mat4 u_viewProjection;
      varying vec3 v_normal;
      varying vec3 v_worldPosition;
      void main() {
        vec4 worldPosition = u_model * vec4(a_position, 1.0);
        gl_Position = u_viewProjection * worldPosition;
        v_worldPosition = worldPosition.xyz;
        v_normal = normalize(mat3(u_model) * a_normal);
      }
    `
  );
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
      precision mediump float;
      uniform vec4 u_color;
      uniform vec3 u_lightDirection;
      varying vec3 v_normal;
      varying vec3 v_worldPosition;
      void main() {
        vec3 normal = normalize(v_normal);
        float diffuse = max(dot(normal, normalize(u_lightDirection)), 0.0);
        float rim = pow(1.0 - max(normal.z, 0.0), 2.0) * 0.08;
        float light = 0.52 + diffuse * 0.42 + rim;
        gl_FragColor = vec4(u_color.rgb * light, u_color.a);
      }
    `
  );
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program.");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Unable to link WebGL program.");
  }
  return program;
}

function createMesh(
  gl: WebGLRenderingContext,
  positions: number[],
  normals: number[],
  indices: number[]
): Mesh {
  const position = gl.createBuffer();
  const normal = gl.createBuffer();
  const index = gl.createBuffer();
  if (!position || !normal || !index) throw new Error("Unable to allocate WebGL buffers.");

  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return { position, normal, index, count: indices.length };
}

function createSphereMesh(gl: WebGLRenderingContext, segments = 12, rings = 8): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const vCoordinate = ring / rings;
    const phi = vCoordinate * Math.PI;
    for (let segment = 0; segment <= segments; segment += 1) {
      const uCoordinate = segment / segments;
      const theta = uCoordinate * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return createMesh(gl, positions, normals, indices);
}

function createCylinderMesh(gl: WebGLRenderingContext, segments = 12): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let yIndex = 0; yIndex <= 1; yIndex += 1) {
    const y = yIndex === 0 ? -1 : 1;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      positions.push(x, y, z);
      normals.push(x, 0, z);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const a = segment;
    const b = segment + segments + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, -1, 0);
  normals.push(0, -1, 0);
  const topCenter = positions.length / 3;
  positions.push(0, 1, 0);
  normals.push(0, 1, 0);
  for (let segment = 0; segment < segments; segment += 1) {
    const next = segment + 1;
    indices.push(bottomCenter, next, segment);
    const topA = segments + 1 + segment;
    const topB = segments + 1 + next;
    indices.push(topCenter, topA, topB);
  }
  return createMesh(gl, positions, normals, indices);
}

function createBoxMesh(gl: WebGLRenderingContext): Mesh {
  const positions = [
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ];
  const normals = [
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ];
  const indices: number[] = [];
  for (let face = 0; face < 6; face += 1) {
    const offset = face * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  return createMesh(gl, positions, normals, indices);
}

function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const gl = canvas.getContext("webgl", {
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("WebGL is not supported on this device.");
  const program = createProgram(gl);
  const modelLocation = gl.getUniformLocation(program, "u_model");
  const viewProjectionLocation = gl.getUniformLocation(program, "u_viewProjection");
  const colorLocation = gl.getUniformLocation(program, "u_color");
  const lightLocation = gl.getUniformLocation(program, "u_lightDirection");
  if (!modelLocation || !viewProjectionLocation || !colorLocation || !lightLocation) {
    throw new Error("Unable to locate WebGL uniforms.");
  }

  gl.enable(gl.DEPTH_TEST);
  // Render procedural geometry double-sided so faces and cylinder caps never
  // disappear when limbs rotate into oblique or mirrored orientations.
  gl.disable(gl.CULL_FACE);
  gl.useProgram(program);

  return {
    gl,
    program,
    positionLocation: gl.getAttribLocation(program, "a_position"),
    normalLocation: gl.getAttribLocation(program, "a_normal"),
    modelLocation,
    viewProjectionLocation,
    colorLocation,
    lightLocation,
    meshes: {
      sphere: createSphereMesh(gl),
      cylinder: createCylinderMesh(gl),
      box: createBoxMesh(gl),
    },
  };
}

function destroyRenderer(renderer: Renderer) {
  const { gl } = renderer;
  Object.values(renderer.meshes).forEach((mesh) => {
    gl.deleteBuffer(mesh.position);
    gl.deleteBuffer(mesh.normal);
    gl.deleteBuffer(mesh.index);
  });
  gl.deleteProgram(renderer.program);
}

function drawMesh(
  renderer: Renderer,
  mesh: Mesh,
  model: Mat4,
  color: readonly [number, number, number, number]
) {
  const { gl } = renderer;
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
  gl.enableVertexAttribArray(renderer.positionLocation);
  gl.vertexAttribPointer(renderer.positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
  gl.enableVertexAttribArray(renderer.normalLocation);
  gl.vertexAttribPointer(renderer.normalLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
  gl.uniformMatrix4fv(renderer.modelLocation, false, model);
  gl.uniform4fv(renderer.colorLocation, color);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
}

function drawSphere(
  renderer: Renderer,
  center: Vec3,
  radius: number,
  color: readonly [number, number, number, number]
) {
  const model = mat4Multiply(
    mat4Translation(center[0], center[1], center[2]),
    mat4Scale(radius, radius, radius)
  );
  drawMesh(renderer, renderer.meshes.sphere, model, color);
}

function drawCylinder(
  renderer: Renderer,
  start: Vec3,
  finish: Vec3,
  radius: number,
  color: readonly [number, number, number, number]
) {
  drawMesh(renderer, renderer.meshes.cylinder, modelBetween(start, finish, radius), color);
}

function drawBox(
  renderer: Renderer,
  center: Vec3,
  size: Vec3,
  color: readonly [number, number, number, number],
  rotation: Vec3 = [0, 0, 0]
) {
  drawMesh(renderer, renderer.meshes.box, modelBox(center, size, rotation), color);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function drawLimb(
  renderer: Renderer,
  start: Vec3,
  joint: Vec3,
  finish: Vec3,
  upperColor: readonly [number, number, number, number],
  lowerColor: readonly [number, number, number, number],
  upperRadius = 0.13,
  lowerRadius = 0.11
) {
  drawCylinder(renderer, start, joint, upperRadius, upperColor);
  drawSphere(renderer, joint, Math.max(upperRadius, lowerRadius) * 1.06, lowerColor);
  drawCylinder(renderer, joint, finish, lowerRadius, lowerColor);
  drawSphere(renderer, finish, lowerRadius * 1.12, lowerColor);
}

function averagePoints(...points: Vec3[]): Vec3 {
  const total = points.reduce<Vec3>(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1], sum[2] + point[2]],
    [0, 0, 0]
  );
  return [total[0] / points.length, total[1] / points.length, total[2] / points.length];
}

function safeNormalize(value: Vec3, fallback: Vec3): Vec3 {
  const length = vectorLength(value);
  if (length < 0.0001) return fallback;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function getBodyBasis(_pose: HumanoidPose3D) {
  const right: Vec3 = [1, 0, 0];
  const up: Vec3 = [0, 1, 0];
  const forward: Vec3 = [0, 0, 1];
  return { right, up, forward };
}

function drawCapsule(
  renderer: Renderer,
  start: Vec3,
  finish: Vec3,
  radius: number,
  color: readonly [number, number, number, number]
) {
  drawCylinder(renderer, start, finish, radius, color);
  drawSphere(renderer, start, radius * 1.02, color);
  drawSphere(renderer, finish, radius * 1.02, color);
}

function drawCharacter(renderer: Renderer, pose: HumanoidPose3D) {
  const shoulderCenter = midpoint(pose.leftShoulder, pose.rightShoulder);
  const hipCenter = midpoint(pose.leftHip, pose.rightHip);
  const chestCenter = averagePoints(shoulderCenter, pose.chest, pose.neck);
  const pelvisCenter = averagePoints(hipCenter, pose.pelvis);
  const { right: bodyRight, up: bodyUp, forward: bodyForward } = getBodyBasis(pose);

  drawCapsule(renderer, pelvisCenter, chestCenter, 0.23, COLORS.shirt);
  drawCapsule(renderer, hipCenter, shoulderCenter, 0.26, COLORS.shirt);
  drawSphere(renderer, chestCenter, 0.27, COLORS.shirtDark);
  drawSphere(renderer, pelvisCenter, 0.24, COLORS.shorts);
  drawSphere(renderer, pose.leftShoulder, 0.17, COLORS.shirt);
  drawSphere(renderer, pose.rightShoulder, 0.17, COLORS.shirt);
  drawSphere(renderer, pose.leftHip, 0.18, COLORS.shorts);
  drawSphere(renderer, pose.rightHip, 0.18, COLORS.shorts);
  drawCapsule(renderer, pose.leftHip, pose.rightHip, 0.16, COLORS.shorts);

  drawCapsule(renderer, shoulderCenter, pose.neck, 0.12, COLORS.shirt);
  drawCapsule(renderer, pose.neck, pose.head, 0.105, COLORS.skin);
  drawSphere(renderer, pose.head, 0.26, COLORS.skin);

  const eyeBase = add(
    add(pose.head, scaleVector(bodyForward, 0.215)),
    scaleVector(bodyUp, 0.03)
  );
  const mouthBase = add(
    add(pose.head, scaleVector(bodyForward, 0.225)),
    scaleVector(bodyUp, -0.06)
  );
  drawSphere(renderer, add(eyeBase, scaleVector(bodyRight, -0.082)), 0.024, COLORS.eye);
  drawSphere(renderer, add(eyeBase, scaleVector(bodyRight, 0.082)), 0.024, COLORS.eye);
  drawCylinder(
    renderer,
    add(mouthBase, scaleVector(bodyRight, -0.05)),
    add(mouthBase, scaleVector(bodyRight, 0.05)),
    0.012,
    COLORS.shirtDark
  );

  drawLimb(
    renderer,
    pose.leftShoulder,
    pose.leftElbow,
    pose.leftWrist,
    COLORS.shirt,
    COLORS.skin
  );
  drawLimb(
    renderer,
    pose.rightShoulder,
    pose.rightElbow,
    pose.rightWrist,
    COLORS.shirt,
    COLORS.skin
  );
  drawSphere(renderer, pose.leftWrist, 0.11, COLORS.skin);
  drawSphere(renderer, pose.rightWrist, 0.11, COLORS.skin);

  drawLimb(
    renderer,
    pose.leftHip,
    pose.leftKnee,
    pose.leftAnkle,
    COLORS.skin,
    COLORS.skin,
    0.17,
    0.14
  );
  drawLimb(
    renderer,
    pose.rightHip,
    pose.rightKnee,
    pose.rightAnkle,
    COLORS.skin,
    COLORS.skin,
    0.17,
    0.14
  );

  const drawFoot = (ankle: Vec3, knee: Vec3) => {
    const shinForward = safeNormalize(
      [bodyForward[0] * 0.85 + (ankle[0] - knee[0]) * 0.15, 0, bodyForward[2] * 0.85 + (ankle[2] - knee[2]) * 0.15],
      bodyForward
    );
    const toeBase = add(ankle, [0, -0.045, 0]);
    const toe = add(toeBase, scaleVector(shinForward, 0.32));
    drawCapsule(renderer, ankle, toe, 0.11, COLORS.shoes);
    drawSphere(renderer, toe, 0.11, COLORS.shoes);
  };
  drawFoot(pose.leftAnkle, pose.leftKnee);
  drawFoot(pose.rightAnkle, pose.rightKnee);
}

function drawBarbell(renderer: Renderer, left: Vec3, right: Vec3, yOffset = 0) {
  const start: Vec3 = [left[0] - 0.45, left[1] + yOffset, left[2]];
  const finish: Vec3 = [right[0] + 0.45, right[1] + yOffset, right[2]];
  drawCylinder(renderer, start, finish, 0.035, COLORS.equipmentLight);
  const direction = normalize(subtract(finish, start));
  const platePositions = [
    add(start, scaleVector(direction, 0.13)),
    add(start, scaleVector(direction, 0.24)),
    add(finish, scaleVector(direction, -0.13)),
    add(finish, scaleVector(direction, -0.24)),
  ];
  for (const position of platePositions) {
    const plateStart = add(position, scaleVector(direction, -0.04));
    const plateFinish = add(position, scaleVector(direction, 0.04));
    drawCylinder(renderer, plateStart, plateFinish, 0.18, COLORS.equipment);
  }
}

function drawDumbbell(renderer: Renderer, wrist: Vec3, axis: Vec3) {
  const handleAxis = safeNormalize(axis, [1, 0, 0]);
  const start = add(wrist, scaleVector(handleAxis, -0.18));
  const finish = add(wrist, scaleVector(handleAxis, 0.18));
  drawCylinder(renderer, start, finish, 0.034, COLORS.equipmentLight);
  for (const offset of [-0.19, -0.12, 0.12, 0.19]) {
    const center = add(wrist, scaleVector(handleAxis, offset));
    const plateHalf = scaleVector(handleAxis, 0.03);
    drawCylinder(renderer, subtract(center, plateHalf), add(center, plateHalf), 0.12, COLORS.equipment);
  }
}

function drawBench(renderer: Renderer, incline = false) {
  if (incline) {
    drawBox(renderer, [0, 1.12, -0.15], [0.82, 0.16, 1.55], COLORS.pad, [-0.68, 0, 0]);
    drawBox(renderer, [0, 0.48, 0.75], [0.82, 0.16, 1.05], COLORS.pad);
  } else {
    drawBox(renderer, [0, 0.58, 0.05], [0.82, 0.16, 2.35], COLORS.pad);
  }
  drawBox(renderer, [-0.3, 0.28, 0.1], [0.11, 0.56, 0.11], COLORS.equipment);
  drawBox(renderer, [0.3, 0.28, 0.1], [0.11, 0.56, 0.11], COLORS.equipment);
}

function drawCable(renderer: Renderer, anchor: Vec3, target: Vec3) {
  drawCylinder(renderer, anchor, target, 0.018, COLORS.equipmentLight);
  drawSphere(renderer, anchor, 0.08, COLORS.equipment);
}

function drawMachineFrame(renderer: Renderer, z = 0.65, height = 3.2, width = 2.1) {
  drawBox(renderer, [-width / 2, height / 2, z], [0.12, height, 0.12], COLORS.equipment);
  drawBox(renderer, [width / 2, height / 2, z], [0.12, height, 0.12], COLORS.equipment);
  drawBox(renderer, [0, height, z], [width + 0.12, 0.12, 0.12], COLORS.equipment);
}

function drawEquipment(
  renderer: Renderer,
  preset: ExerciseGuidePreset,
  equipment: Equipment3D,
  pose: HumanoidPose3D
) {
  const { right: bodyRight, forward: bodyForward } = getBodyBasis(pose);
  const handAxis: Vec3 = Math.abs(bodyRight[0]) + Math.abs(bodyRight[2]) > 0.2 ? bodyRight : [1, 0, 0];
  const handOffsetAmountMap: Partial<Record<ExerciseGuidePreset, number>> = {
    "bench-press": 0.04,
    "incline-press": 0.04,
    "lat-pulldown": 0.06,
    "assisted-pull-up": 0.06,
    "barbell-curl": 0.04,
    "hammer-curl": 0.05,
    "alternating-curl": 0.05,
    "lateral-raise": 0.04,
    "shoulder-press": 0.04,
    "romanian-deadlift": 0.02,
    "split-squat": 0.03,
    "assisted-dip": 0.03,
    "cable-crunch": 0.01,
    "preacher-curl": 0.03,
  };
  const handOffsetAmount = handOffsetAmountMap[preset] ?? 0.05;
  const leftHandOffset = add(pose.leftWrist, scaleVector(bodyForward, handOffsetAmount));
  const rightHandOffset = add(pose.rightWrist, scaleVector(bodyForward, handOffsetAmount));
  switch (equipment) {
    case "barbell":
      drawBarbell(renderer, leftHandOffset, rightHandOffset);
      break;
    case "dumbbells":
      drawDumbbell(renderer, leftHandOffset, handAxis);
      drawDumbbell(renderer, rightHandOffset, handAxis);
      break;
    case "bench-barbell":
      drawBench(renderer);
      drawBarbell(renderer, leftHandOffset, rightHandOffset);
      drawMachineFrame(renderer, 0.75, 2.55, 2.25);
      break;
    case "incline-dumbbells":
      drawBench(renderer, true);
      drawDumbbell(renderer, leftHandOffset, handAxis);
      drawDumbbell(renderer, rightHandOffset, handAxis);
      break;
    case "pulldown": {
      drawMachineFrame(renderer, 0.5, 3.35, 2.05);
      drawBox(renderer, [0, 0.95, 0.25], [0.92, 0.14, 0.9], COLORS.pad);
      drawBox(renderer, [0, 1.22, -0.05], [0.85, 0.14, 0.28], COLORS.pad);
      drawBarbell(renderer, leftHandOffset, rightHandOffset);
      drawCable(renderer, [0, 3.32, 0.48], midpoint(leftHandOffset, rightHandOffset));
      break;
    }
    case "cable-row": {
      const seatY = pose.pelvis[1] - 0.72;
      drawMachineFrame(renderer, 0.98, 2.55, 1.72);
      drawBox(renderer, [0, seatY, 0.18], [0.92, 0.12, 0.82], COLORS.pad);
      drawBox(renderer, [0, seatY + 0.04, 1.06], [1.1, 0.12, 0.48], COLORS.equipment);
      const handle = midpoint(leftHandOffset, rightHandOffset);
      drawCable(renderer, [0, pose.chest[1] - 0.2, 0.86], handle);
      drawCylinder(renderer, leftHandOffset, rightHandOffset, 0.045, COLORS.equipmentLight);
      break;
    }
    case "squat-rack":
      drawMachineFrame(renderer, 0.55, 3.0, 2.25);
      drawBarbell(renderer, pose.leftShoulder, pose.rightShoulder, 0.06);
      drawBox(renderer, [-1.05, 1.9, 0.5], [0.42, 0.07, 0.42], COLORS.equipmentLight);
      drawBox(renderer, [1.05, 1.9, 0.5], [0.42, 0.07, 0.42], COLORS.equipmentLight);
      break;
    case "leg-press": {
      drawBox(renderer, [0, 0.8, 0.3], [1.0, 0.18, 2.25], COLORS.pad, [-0.68, 0, 0]);
      const footPlateCenter = averagePoints(pose.leftAnkle, pose.rightAnkle);
      drawBox(renderer, [footPlateCenter[0], footPlateCenter[1] + 0.16, footPlateCenter[2] - 0.18], [1.35, 1.2, 0.18], COLORS.equipment, [-0.18, 0, 0]);
      drawBox(renderer, [-0.75, 0.95, -0.45], [0.12, 2.7, 0.12], COLORS.equipment, [-0.68, 0, 0]);
      drawBox(renderer, [0.75, 0.95, -0.45], [0.12, 2.7, 0.12], COLORS.equipment, [-0.68, 0, 0]);
      break;
    }
    case "bench":
      drawBench(renderer);
      break;
    case "cable": {
      drawMachineFrame(renderer, 0.82, 3.25, 1.8);
      const target = midpoint(leftHandOffset, rightHandOffset);
      drawCable(renderer, [0, 3.12, 0.74], target);
      drawCylinder(renderer, leftHandOffset, rightHandOffset, 0.035, COLORS.equipmentLight);
      break;
    }
    case "chest-press": {
      const seatY = pose.pelvis[1] - 0.45;
      drawBox(renderer, [0, seatY, -0.08], [0.9, 0.14, 0.88], COLORS.pad);
      drawBox(renderer, [0, pose.chest[1] - 0.06, -0.34], [0.9, 1.05, 0.14], COLORS.pad);
      drawMachineFrame(renderer, 0.58, 2.9, 1.86);
      drawCylinder(renderer, [-0.62, pose.leftWrist[1], 0.18], leftHandOffset, 0.05, COLORS.equipmentLight);
      drawCylinder(renderer, [0.62, pose.rightWrist[1], 0.18], rightHandOffset, 0.05, COLORS.equipmentLight);
      break;
    }
    case "pec-deck": {
      const seatY = pose.pelvis[1] - 0.45;
      drawBox(renderer, [0, seatY, -0.08], [0.9, 0.14, 0.88], COLORS.pad);
      drawBox(renderer, [0, pose.chest[1] - 0.06, -0.34], [0.9, 1.05, 0.14], COLORS.pad);
      drawMachineFrame(renderer, 0.56, 2.85, 2.06);
      drawCylinder(renderer, [-0.84, pose.leftElbow[1], 0.18], pose.leftElbow, 0.06, COLORS.equipmentLight);
      drawCylinder(renderer, [0.84, pose.rightElbow[1], 0.18], pose.rightElbow, 0.06, COLORS.equipmentLight);
      break;
    }
    case "pull-up": {
      drawMachineFrame(renderer, 0.28, 3.15, 2.4);
      drawCylinder(renderer, [-1.25, 3.02, 0.25], [1.25, 3.02, 0.25], 0.055, COLORS.equipmentLight);
      const kneePadY = (pose.leftKnee[1] + pose.rightKnee[1]) / 2 - 0.08;
      const kneePadZ = (pose.leftKnee[2] + pose.rightKnee[2]) / 2 + 0.02;
      drawBox(renderer, [0, kneePadY, kneePadZ], [0.74, 0.12, 0.52], COLORS.pad);
      break;
    }
    case "hack-squat": {
      const sledCenter = averagePoints(pose.leftShoulder, pose.rightShoulder, pose.pelvis);
      drawBox(renderer, [sledCenter[0], sledCenter[1], sledCenter[2] + 0.42], [1.08, 2.45, 0.18], COLORS.pad, [-0.14, 0, 0]);
      drawBox(renderer, [0, 0.08, -0.1], [1.45, 0.14, 1.0], COLORS.equipment);
      drawBox(renderer, [-0.73, 1.45, 0.52], [0.1, 3.0, 0.1], COLORS.equipment, [-0.14, 0, 0]);
      drawBox(renderer, [0.73, 1.45, 0.52], [0.1, 3.0, 0.1], COLORS.equipment, [-0.14, 0, 0]);
      break;
    }
    case "leg-extension":
    case "leg-curl":
      drawBox(renderer, [0, 0.72, 0.25], [1.0, 0.16, 1.05], COLORS.pad);
      drawBox(renderer, [0, 1.55, 0.5], [1.0, 1.3, 0.16], COLORS.pad);
      drawCylinder(
        renderer,
        [pose.leftAnkle[0] - 0.18, pose.leftAnkle[1], pose.leftAnkle[2]],
        [pose.rightAnkle[0] + 0.18, pose.rightAnkle[1], pose.rightAnkle[2]],
        0.15,
        COLORS.accent
      );
      break;
    case "hip-thrust":
      drawBox(renderer, [0, 0.72, -0.7], [1.05, 0.16, 0.65], COLORS.pad);
      drawBox(renderer, [0, pose.pelvis[1] + 0.1, pose.pelvis[2] - 0.02], [1.0, 0.15, 0.34], COLORS.accent);
      break;
    case "calf-raise":
      drawMachineFrame(renderer, 0.45, 3.0, 1.8);
      drawBox(renderer, [0, 0.06, 0], [1.25, 0.12, 0.75], COLORS.equipment);
      drawBox(renderer, [-0.42, 2.35, 0], [0.32, 0.18, 0.55], COLORS.pad);
      drawBox(renderer, [0.42, 2.35, 0], [0.32, 0.18, 0.55], COLORS.pad);
      break;
    case "preacher": {
      const seatY = pose.pelvis[1] - 0.45;
      drawBox(renderer, [0, seatY, -0.06], [0.9, 0.14, 0.82], COLORS.pad);
      drawBox(renderer, [0, 1.2, 0.22], [1.02, 0.14, 0.78], COLORS.pad, [0.42, 0, 0]);
      drawCylinder(renderer, leftHandOffset, rightHandOffset, 0.045, COLORS.equipmentLight);
      break;
    }
    case "dip": {
      drawMachineFrame(renderer, 0.28, 2.9, 1.96);
      const handleY = (pose.leftWrist[1] + pose.rightWrist[1]) / 2;
      drawCylinder(renderer, [-0.56, handleY, -0.02], [-0.56, handleY, 0.26], 0.05, COLORS.equipmentLight);
      drawCylinder(renderer, [0.56, handleY, -0.02], [0.56, handleY, 0.26], 0.05, COLORS.equipmentLight);
      const kneePadY = (pose.leftKnee[1] + pose.rightKnee[1]) / 2 - 0.06;
      const kneePadZ = (pose.leftKnee[2] + pose.rightKnee[2]) / 2 + 0.02;
      drawBox(renderer, [0, kneePadY, kneePadZ], [0.58, 0.12, 0.42], COLORS.pad);
      break;
    }
    case "ab-crunch":
      drawBox(renderer, [0, 0.72, -0.12], [1.0, 0.16, 1.05], COLORS.pad);
      drawBox(renderer, [0, 1.5, -0.38], [1.0, 1.2, 0.16], COLORS.pad);
      drawCylinder(renderer, [-0.48, 1.76, -0.18], pose.leftWrist, 0.055, COLORS.equipmentLight);
      drawCylinder(renderer, [0.48, 1.76, -0.18], pose.rightWrist, 0.055, COLORS.equipmentLight);
      break;
    case "ab-wheel": {
      const wheelCenter = midpoint(pose.leftWrist, pose.rightWrist);
      drawCylinder(
        renderer,
        [wheelCenter[0] - 0.28, wheelCenter[1], wheelCenter[2]],
        [wheelCenter[0] + 0.28, wheelCenter[1], wheelCenter[2]],
        0.04,
        COLORS.equipmentLight
      );
      drawCylinder(
        renderer,
        [wheelCenter[0] - 0.05, wheelCenter[1], wheelCenter[2]],
        [wheelCenter[0] + 0.05, wheelCenter[1], wheelCenter[2]],
        0.22,
        COLORS.equipment
      );
      drawBox(renderer, [0, 0.025, 0.1], [1.6, 0.05, 3.7], COLORS.floor);
      break;
    }
    case "treadmill":
      drawBox(renderer, [0, 0.04, 0.12], [1.5, 0.12, 3.2], COLORS.equipment);
      drawBox(renderer, [0, 0.1, 0.12], [1.18, 0.05, 2.78], COLORS.shirtDark);
      drawBox(renderer, [-0.66, 0.94, -1.04], [0.08, 1.82, 0.08], COLORS.equipmentLight);
      drawBox(renderer, [0.66, 0.94, -1.04], [0.08, 1.82, 0.08], COLORS.equipmentLight);
      drawBox(renderer, [0, 1.78, -0.92], [1.1, 0.08, 0.08], COLORS.equipmentLight);
      drawBox(renderer, [0, 1.34, -0.72], [0.44, 0.26, 0.18], COLORS.equipment);
      break;
    case "mat":
      drawBox(renderer, [0, 0.025, 0.25], [1.5, 0.05, 3.9], COLORS.floor);
      break;
    default:
      break;
  }
}

function drawFloor(renderer: Renderer) {
  drawBox(renderer, [0, -0.075, 0.2], [5.4, 0.1, 5.4], COLORS.floor);
  for (let index = -2; index <= 2; index += 1) {
    drawBox(renderer, [index, -0.018, 0.2], [0.012, 0.012, 5.2], [0.56, 0.78, 0.68, 0.5]);
    drawBox(renderer, [0, -0.018, index + 0.2], [5.2, 0.012, 0.012], [0.56, 0.78, 0.68, 0.5]);
  }
}

export default function SimpleExercise3DCanvas({
  preset,
  mode,
  playing,
  cameraView,
  cameraRevision,
  language,
  exerciseName,
}: Exercise3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ preset, mode, playing, cameraView, cameraRevision });

  useEffect(() => {
    propsRef.current = { preset, mode, playing, cameraView, cameraRevision };
  }, [preset, mode, playing, cameraView, cameraRevision]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer;
    try {
      renderer = createRenderer(canvas);
    } catch (error) {
      if (errorRef.current) {
        errorRef.current.textContent =
          language === "id"
            ? "Perangkat ini tidak dapat membuka panduan 3D."
            : "This device cannot open the 3D guide.";
        errorRef.current.hidden = false;
      }
      console.error("Exercise 3D initialization error", error);
      return;
    }

    const { gl } = renderer;
    let animationFrame = 0;
    let stopped = false;
    let width = 1;
    let height = 1;
    let yaw = 0;
    let pitch = 0.02;
    let distanceOffset = 0;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let pinchDistance = 0;
    const activePointers = new Map<number, { x: number; y: number }>();
    let previousCameraView = propsRef.current.cameraView;
    let previousCameraRevision = propsRef.current.cameraRevision;

    const cameraYaw = (view: Exercise3DCanvasProps["cameraView"]) => {
      if (view === "side") return Math.PI / 2;
      if (view === "back") return Math.PI;
      return 0;
    };
    yaw = cameraYaw(previousCameraView);

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      width = canvas.width;
      height = canvas.height;
      gl.viewport(0, 0, width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const pointerGap = () => {
      const values = [...activePointers.values()];
      if (values.length < 2) return 0;
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    };
    const handlePointerDown = (event: PointerEvent) => {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (activePointers.size === 2) pinchDistance = pointerGap();
      canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size >= 2) {
        const nextDistance = pointerGap();
        if (pinchDistance > 0) {
          distanceOffset = Math.max(
            -1.3,
            Math.min(2.2, distanceOffset + (pinchDistance - nextDistance) * 0.008)
          );
        }
        pinchDistance = nextDistance;
        return;
      }
      if (!dragging) return;
      const deltaX = event.clientX - pointerX;
      const deltaY = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      yaw += deltaX * 0.008;
      pitch = Math.max(-0.32, Math.min(0.32, pitch + deltaY * 0.004));
    };
    const handlePointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      dragging = activePointers.size > 0;
      pinchDistance = activePointers.size >= 2 ? pointerGap() : 0;
      const remaining = [...activePointers.values()][0];
      if (remaining) {
        pointerX = remaining.x;
        pointerY = remaining.y;
      }
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      distanceOffset = Math.max(-1.3, Math.min(2.2, distanceOffset + event.deltaY * 0.003));
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    let previousFrameTime = performance.now();
    let animationProgress = 0;
    const render = (time: number) => {
      if (stopped) return;
      const current = propsRef.current;
      if (
        current.cameraView !== previousCameraView ||
        current.cameraRevision !== previousCameraRevision
      ) {
        previousCameraView = current.cameraView;
        previousCameraRevision = current.cameraRevision;
        yaw = cameraYaw(current.cameraView);
        pitch = 0.02;
        distanceOffset = 0;
      }

      const deltaTime = Math.min(64, Math.max(0, time - previousFrameTime));
      previousFrameTime = time;
      if (current.mode === "animation" && current.playing) {
        animationProgress = (animationProgress + deltaTime / 3600) % 1;
      }
      const pingPong =
        animationProgress < 0.5
          ? animationProgress * 2
          : (1 - animationProgress) * 2;
      const progress =
        current.mode === "start"
          ? 0
          : current.mode === "finish"
            ? 1
            : pingPong;
      const scene = getExercise3DScene(current.preset, progress);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(renderer.program);
      gl.uniform3fv(renderer.lightLocation, new Float32Array([0.35, 0.8, 0.55]));

      const cameraDistance = scene.cameraDistance + distanceOffset;
      const horizontalDistance = cameraDistance * Math.cos(pitch);
      const eye: Vec3 = [
        Math.sin(yaw) * horizontalDistance,
        scene.cameraTargetY + Math.sin(-pitch) * cameraDistance + 0.35,
        Math.cos(yaw) * horizontalDistance,
      ];
      const target: Vec3 = [0, scene.cameraTargetY, 0.15];
      const view = mat4LookAt(eye, target, [0, 1, 0]);
      const projection = mat4Perspective(Math.PI / 4.2, width / height, 0.05, 100);
      const viewProjection = mat4Multiply(projection, view);
      gl.uniformMatrix4fv(renderer.viewProjectionLocation, false, viewProjection);

      drawFloor(renderer);
      drawEquipment(renderer, current.preset, scene.equipment, scene.pose);
      drawCharacter(renderer, scene.pose);

      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      destroyRenderer(renderer);
    };
  }, [language]);

  return (
    <div className="relative h-full min-h-[270px] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.95),rgba(209,250,229,0.78)_54%,rgba(167,243,208,0.5))] dark:bg-[radial-gradient(circle_at_50%_26%,rgba(30,41,59,0.98),rgba(6,78,59,0.72)_58%,rgba(2,44,34,0.82))]">
      <canvas
        ref={canvasRef}
        className="h-full min-h-[270px] w-full cursor-grab touch-none active:cursor-grabbing sm:min-h-[360px]"
        aria-label={
          language === "id"
            ? `Panduan gerakan 3D ${exerciseName}. Geser untuk memutar dan cubit atau scroll untuk memperbesar.`
            : `3D movement guide for ${exerciseName}. Drag to rotate and pinch or scroll to zoom.`
        }
        role="img"
      />
      <div
        ref={errorRef}
        hidden
        className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-center text-sm font-bold text-white"
      />
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/65 dark:text-slate-200 sm:text-xs">
        {language === "id" ? "Geser untuk putar • Scroll untuk zoom" : "Drag to rotate • Scroll to zoom"}
      </div>
    </div>
  );
}
