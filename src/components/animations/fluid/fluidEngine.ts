// 流体の背景の WebGL2 エンジン．React には依存しない．
// 使えない環境（WebGL2 が無い・半精度浮動小数のテクスチャへ描けない・シェーダーが通らない）では null を返し，例外は投げない．
import {
  FLUID_DENSITY_CAP,
  FLUID_DYE_RETENTION_PER_SEC,
  FLUID_FORCE_GAIN,
  FLUID_MAX_SPEED,
  FLUID_QUALITY_TIERS,
  FLUID_VELOCITY_RETENTION_PER_SEC,
  FLUID_VISIBLE_DENSITY,
  getDecayFactor,
  getFluidGridSize,
  type FluidColors,
  type FluidSplat,
} from '../../../lib/animations/fluid';
import {
  ADVECTION_SOURCE,
  CURL_SOURCE,
  DISPLAY_SOURCE,
  DISPLACEMENT_SOURCE,
  DIVERGENCE_SOURCE,
  GRADIENT_SUBTRACT_SOURCE,
  PRESSURE_SOURCE,
  SCALE_SOURCE,
  SPLAT_SOURCE,
  VERTEX_SOURCE,
  VORTICITY_SOURCE,
} from './fluidShaders';

// 渦度の閉じ込めの強さ（マス／秒²）．大きいほど細かい渦が残る
const VORTICITY_STRENGTH = 14;
// ずらしの地図の短辺側ではなく，横幅のマス数（縦は画面の縦横比から決める）．小さいほど読み出しと画像化が軽い
const DISPLACEMENT_MAP_WIDTH = 160;
// 速度 × 濃さを地図の振れ幅へ変える倍率
const DISPLACEMENT_GAIN = 4;
// 前のコマの圧力を，次の反復の初期値として残す割合
const PRESSURE_CARRY = 0.8;
// これ未満の速度・染料は 0 へ落とす（半精度の小さな値が居座らないように）
const VELOCITY_FLOOR = 0.002;
const DYE_FLOOR = 0.002;
// 1 つの染料の置き場所で，速度の成分が超えてはいけない値（マス／秒）の余裕の倍率
const VELOCITY_CAP_MARGIN = 1.5;

type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  program: WebGLProgram;
  uniforms: Uniforms;
}

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  texelX: number;
  texelY: number;
}

interface DoubleTarget {
  read: Target;
  write: Target;
}

interface TextureFormat {
  internalFormat: number;
  format: number;
  type: number;
}

// 画面を歪ませる地図（RGBA の 1 画素 4 バイト．上の行から）
export interface FluidDisplacementMap {
  width: number;
  height: number;
  data: Uint8Array;
}

export interface FluidEngine {
  // 品質の段階（FLUID_QUALITY_TIERS の添字）に合わせて，テクスチャと canvas の大きさを作り直す．中身は空になる
  resize: (viewportWidth: number, viewportHeight: number, tier: number) => boolean;
  // 染料と速度を置く
  inject: (splats: readonly FluidSplat[]) => void;
  // 流体を dtSec 進めて，画面へ描く
  step: (dtSec: number) => void;
  // いまの流れから，画面を歪ませる地図を読み出す（step のあとに呼ぶ）．作れなければ null
  readDisplacement: () => FluidDisplacementMap | null;
  // 染料と速度を空にして，透明な絵を出す
  clear: () => void;
  // 染料の色（テーマの切り替えで呼ぶ）
  setColors: (colors: FluidColors) => void;
  isContextLost: () => boolean;
  dispose: () => void;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentSource: string): Program | null {
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!fragmentShader || !program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let index = 0; index < count; index += 1) {
    const info = gl.getActiveUniform(program, index);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

function createTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: TextureFormat,
  filter: number,
): Target | null {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, format.type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const isComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  if (!isComplete) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    return null;
  }
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height, texelX: 1 / width, texelY: 1 / height };
}

function createDoubleTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: TextureFormat,
  filter: number,
): DoubleTarget | null {
  const read = createTarget(gl, width, height, format, filter);
  const write = createTarget(gl, width, height, format, filter);
  if (!read || !write) return null;
  return { read, write };
}

function deleteTarget(gl: WebGL2RenderingContext, target: Target | null | undefined): void {
  if (!target) return;
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}

function swap(target: DoubleTarget): void {
  const read = target.read;
  target.read = target.write;
  target.write = read;
}

// WebGL2 で半精度浮動小数（R16F・RG16F）のテクスチャへ描けるかを確かめる
function canRenderToHalfFloat(gl: WebGL2RenderingContext, formats: readonly TextureFormat[]): boolean {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return false;
  return formats.every((format) => {
    const target = createTarget(gl, 4, 4, format, gl.NEAREST);
    if (!target) return false;
    deleteTarget(gl, target);
    return true;
  });
}

export function createFluidEngine(canvas: HTMLCanvasElement, initialColors: FluidColors): FluidEngine | null {
  try {
    return buildEngine(canvas, initialColors);
  } catch {
    return null;
  }
}

function buildEngine(canvas: HTMLCanvasElement, initialColors: FluidColors): FluidEngine | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const rgFormat: TextureFormat = { internalFormat: gl.RG16F, format: gl.RG, type: gl.HALF_FLOAT };
  const rFormat: TextureFormat = { internalFormat: gl.R16F, format: gl.RED, type: gl.HALF_FLOAT };
  if (!canRenderToHalfFloat(gl, [rgFormat, rFormat])) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  if (!vertexShader) return null;
  const splatProgram = createProgram(gl, vertexShader, SPLAT_SOURCE);
  const advectionProgram = createProgram(gl, vertexShader, ADVECTION_SOURCE);
  const divergenceProgram = createProgram(gl, vertexShader, DIVERGENCE_SOURCE);
  const pressureProgram = createProgram(gl, vertexShader, PRESSURE_SOURCE);
  const gradientProgram = createProgram(gl, vertexShader, GRADIENT_SUBTRACT_SOURCE);
  const curlProgram = createProgram(gl, vertexShader, CURL_SOURCE);
  const vorticityProgram = createProgram(gl, vertexShader, VORTICITY_SOURCE);
  const scaleProgram = createProgram(gl, vertexShader, SCALE_SOURCE);
  const displayProgram = createProgram(gl, vertexShader, DISPLAY_SOURCE);
  const displacementProgram = createProgram(gl, vertexShader, DISPLACEMENT_SOURCE);
  gl.deleteShader(vertexShader);
  if (
    !splatProgram || !advectionProgram || !divergenceProgram || !pressureProgram || !gradientProgram ||
    !curlProgram || !vorticityProgram || !scaleProgram || !displayProgram
  ) {
    return null;
  }

  let velocity: DoubleTarget | null = null;
  let dye: DoubleTarget | null = null;
  let pressure: DoubleTarget | null = null;
  let divergence: Target | null = null;
  let curl: Target | null = null;
  let displacement: Target | null = null;
  let displacementPixels: Uint8Array | null = null;
  let jacobiIterations: number = FLUID_QUALITY_TIERS[0].jacobiIterations;
  let velocityCells: number = FLUID_QUALITY_TIERS[0].velocityCells;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let colors = initialColors;
  let isDisposed = false;

  const bindTexture = (program: Program, name: string, unit: number, texture: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(program.uniforms[name], unit);
  };

  // 全画面の三角形を，指定の対象へ描く（null なら canvas）
  const draw = (target: Target | null) => {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const releaseTargets = () => {
    [velocity, dye, pressure].forEach((pair) => {
      deleteTarget(gl, pair?.read);
      deleteTarget(gl, pair?.write);
    });
    deleteTarget(gl, divergence);
    deleteTarget(gl, curl);
    deleteTarget(gl, displacement);
    displacement = null;
    displacementPixels = null;
    velocity = null;
    dye = null;
    pressure = null;
    divergence = null;
    curl = null;
  };

  const resize = (width: number, height: number, tier: number): boolean => {
    if (isDisposed || gl.isContextLost()) return false;
    const quality = FLUID_QUALITY_TIERS[Math.min(Math.max(tier, 0), FLUID_QUALITY_TIERS.length - 1)];
    const velocitySize = getFluidGridSize(width, height, quality.velocityCells);
    const dyeSize = getFluidGridSize(width, height, quality.dyeCells);
    releaseTargets();
    velocity = createDoubleTarget(gl, velocitySize.width, velocitySize.height, rgFormat, gl.LINEAR);
    dye = createDoubleTarget(gl, dyeSize.width, dyeSize.height, rgFormat, gl.LINEAR);
    pressure = createDoubleTarget(gl, velocitySize.width, velocitySize.height, rFormat, gl.NEAREST);
    divergence = createTarget(gl, velocitySize.width, velocitySize.height, rFormat, gl.NEAREST);
    curl = createTarget(gl, velocitySize.width, velocitySize.height, rFormat, gl.NEAREST);
    if (!velocity || !dye || !pressure || !divergence || !curl) {
      releaseTargets();
      return false;
    }
    // ずらしの地図は付け足しの機能．作れなくても流体本体は動かす
    const rgbaFormat: TextureFormat = { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
    const mapWidth = DISPLACEMENT_MAP_WIDTH;
    const mapHeight = Math.max(1, Math.round((DISPLACEMENT_MAP_WIDTH * Math.max(1, height)) / Math.max(1, width)));
    displacement = createTarget(gl, mapWidth, mapHeight, rgbaFormat, gl.LINEAR);
    displacementPixels = displacement ? new Uint8Array(mapWidth * mapHeight * 4) : null;
    jacobiIterations = quality.jacobiIterations;
    velocityCells = quality.velocityCells;
    viewportWidth = Math.max(1, width);
    viewportHeight = Math.max(1, height);
    // canvas は染料の格子と同じ大きさ．CSS で画面いっぱいへ引き伸ばす（低解像度を拡大）
    canvas.width = dyeSize.width;
    canvas.height = dyeSize.height;
    return true;
  };

  const inject = (splats: readonly FluidSplat[]) => {
    if (isDisposed || !velocity || !dye || splats.length === 0) return;
    const aspect = viewportWidth / viewportHeight;
    const velocityCap = FLUID_MAX_SPEED * velocityCells * VELOCITY_CAP_MARGIN;
    gl.useProgram(splatProgram.program);
    gl.uniform1f(splatProgram.uniforms.uAspect, aspect);
    for (const splat of splats) {
      // 染料の広がりは，ポインタの動きに合わせて 1 か所ごとに変わる
      gl.uniform1f(splatProgram.uniforms.uRadius, splat.radiusPx / viewportHeight);
      gl.uniform2f(splatProgram.uniforms.uPoint, splat.x, splat.y);
      // 速度：短辺／秒 → マス／秒
      bindTexture(splatProgram, 'uTarget', 0, velocity.read.texture);
      gl.uniform3f(
        splatProgram.uniforms.uValue,
        splat.velocityX * velocityCells * FLUID_FORCE_GAIN,
        splat.velocityY * velocityCells * FLUID_FORCE_GAIN,
        0,
      );
      gl.uniform1f(splatProgram.uniforms.uCap, velocityCap);
      draw(velocity.write);
      swap(velocity);
      // 染料：濃さと，濃さ × 色相
      bindTexture(splatProgram, 'uTarget', 0, dye.read.texture);
      gl.uniform3f(splatProgram.uniforms.uValue, splat.density, splat.density * splat.hue, 0);
      gl.uniform1f(splatProgram.uniforms.uCap, FLUID_DENSITY_CAP);
      draw(dye.write);
      swap(dye);
    }
  };

  const advect = (field: DoubleTarget, velocityField: DoubleTarget, dtSec: number, retentionPerSec: number, floor: number) => {
    gl.useProgram(advectionProgram.program);
    gl.uniform2f(advectionProgram.uniforms.uVelocityTexel, velocityField.read.texelX, velocityField.read.texelY);
    gl.uniform1f(advectionProgram.uniforms.uDt, dtSec);
    gl.uniform1f(advectionProgram.uniforms.uDecay, getDecayFactor(dtSec, retentionPerSec));
    gl.uniform1f(advectionProgram.uniforms.uFloor, floor);
    bindTexture(advectionProgram, 'uVelocity', 0, velocityField.read.texture);
    bindTexture(advectionProgram, 'uSource', 1, field.read.texture);
    draw(field.write);
    swap(field);
  };

  const render = () => {
    if (!dye || !velocity) return;
    gl.useProgram(displayProgram.program);
    bindTexture(displayProgram, 'uDye', 0, dye.read.texture);
    bindTexture(displayProgram, 'uVelocity', 1, velocity.read.texture);
    // 速度（マス／秒）→ ほぼ -1〜1（短辺の 2 倍／秒で 1）
    gl.uniform1f(displayProgram.uniforms.uVelocityScale, 1 / (velocityCells * 2));
    gl.uniform3f(displayProgram.uniforms.uColorPrimary, ...colors.primary);
    gl.uniform3f(displayProgram.uniforms.uColorSecondary, ...colors.secondary);
    gl.uniform1f(displayProgram.uniforms.uMaxAlpha, colors.maxAlpha);
    gl.uniform1f(displayProgram.uniforms.uVisible, FLUID_VISIBLE_DENSITY);
    draw(null);
  };

  const readDisplacement = (): FluidDisplacementMap | null => {
    // 地図は付け足し．シェーダーが通らなくても流体本体は動かす
    if (isDisposed || gl.isContextLost() || !displacementProgram || !dye || !velocity || !displacement || !displacementPixels) return null;
    gl.useProgram(displacementProgram.program);
    bindTexture(displacementProgram, 'uDye', 0, dye.read.texture);
    bindTexture(displacementProgram, 'uVelocity', 1, velocity.read.texture);
    gl.uniform1f(displacementProgram.uniforms.uVisible, FLUID_VISIBLE_DENSITY);
    gl.uniform1f(displacementProgram.uniforms.uVelocityScale, 1 / (velocityCells * 2));
    gl.uniform1f(displacementProgram.uniforms.uGain, DISPLACEMENT_GAIN);
    draw(displacement);
    gl.readPixels(0, 0, displacement.width, displacement.height, gl.RGBA, gl.UNSIGNED_BYTE, displacementPixels);
    return { width: displacement.width, height: displacement.height, data: displacementPixels };
  };

  const step = (dtSec: number) => {
    if (isDisposed || gl.isContextLost() || !velocity || !dye || !pressure || !divergence || !curl) return;
    const texel = [velocity.read.texelX, velocity.read.texelY] as const;

    // 渦度の閉じ込め
    gl.useProgram(curlProgram.program);
    gl.uniform2f(curlProgram.uniforms.uTexel, texel[0], texel[1]);
    bindTexture(curlProgram, 'uVelocity', 0, velocity.read.texture);
    draw(curl);
    gl.useProgram(vorticityProgram.program);
    gl.uniform2f(vorticityProgram.uniforms.uTexel, texel[0], texel[1]);
    gl.uniform1f(vorticityProgram.uniforms.uStrength, VORTICITY_STRENGTH);
    gl.uniform1f(vorticityProgram.uniforms.uDt, dtSec);
    bindTexture(vorticityProgram, 'uVelocity', 0, velocity.read.texture);
    bindTexture(vorticityProgram, 'uCurl', 1, curl.texture);
    draw(velocity.write);
    swap(velocity);

    // 圧力の射影（発散 → ヤコビ反復 → 勾配の減算）
    gl.useProgram(divergenceProgram.program);
    gl.uniform2f(divergenceProgram.uniforms.uTexel, texel[0], texel[1]);
    bindTexture(divergenceProgram, 'uVelocity', 0, velocity.read.texture);
    draw(divergence);
    gl.useProgram(scaleProgram.program);
    gl.uniform1f(scaleProgram.uniforms.uScale, PRESSURE_CARRY);
    bindTexture(scaleProgram, 'uSource', 0, pressure.read.texture);
    draw(pressure.write);
    swap(pressure);
    gl.useProgram(pressureProgram.program);
    gl.uniform2f(pressureProgram.uniforms.uTexel, texel[0], texel[1]);
    bindTexture(pressureProgram, 'uDivergence', 1, divergence.texture);
    for (let iteration = 0; iteration < jacobiIterations; iteration += 1) {
      bindTexture(pressureProgram, 'uPressure', 0, pressure.read.texture);
      draw(pressure.write);
      swap(pressure);
    }
    gl.useProgram(gradientProgram.program);
    gl.uniform2f(gradientProgram.uniforms.uTexel, texel[0], texel[1]);
    bindTexture(gradientProgram, 'uPressure', 0, pressure.read.texture);
    bindTexture(gradientProgram, 'uVelocity', 1, velocity.read.texture);
    draw(velocity.write);
    swap(velocity);

    // 移流：速度は自分自身を運び，染料は速度に運ばれる
    advect(velocity, velocity, dtSec, FLUID_VELOCITY_RETENTION_PER_SEC, VELOCITY_FLOOR);
    advect(dye, velocity, dtSec, FLUID_DYE_RETENTION_PER_SEC, DYE_FLOOR);
    render();
  };

  const clear = () => {
    if (isDisposed || gl.isContextLost()) return;
    [velocity, dye, pressure].forEach((pair) => {
      [pair?.read, pair?.write].forEach((target) => {
        if (!target) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, target.width, target.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      });
    });
    // 透明な絵を出す（canvas に前の絵が残らないように）
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;
    if (gl.isContextLost()) return;
    releaseTargets();
    [splatProgram, advectionProgram, divergenceProgram, pressureProgram, gradientProgram, curlProgram, vorticityProgram, scaleProgram, displayProgram, displacementProgram]
      .forEach((entry) => entry && gl.deleteProgram(entry.program));
  };

  return {
    resize,
    inject,
    step,
    readDisplacement,
    clear,
    setColors: (next) => { colors = next; },
    isContextLost: () => gl.isContextLost(),
    dispose,
  };
}
