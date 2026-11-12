// 流体カーソルの WebGL2 エンジン．React には依存しない．
// 流体の方程式は解かない．1/4 解像度の「速度と重み」のバッファ（前のコマ／今のコマ）と，
// 1/8 解像度のぼかした写し 1 枚を持ち，1 コマに次の 4 回だけ描く．
//   1. 更新（1/4 解像度）  2. 横ぼかし（1/4 → 1/8）  3. 縦ぼかし（1/8）  4. 表示（画面の 1/2 以下）
// 使えない環境（WebGL2 が無い・シェーダーが通らない）では null を返し，例外は投げない．
import {
  FLUID_BLUR_DIVISOR_RATIO,
  FLUID_BLUR_RADIUS_PX,
  FLUID_BLUR_SIGMA_RATIO,
  FLUID_FALLOFF_END,
  FLUID_FALLOFF_START,
  FLUID_NOISE_GAIN_PX,
  FLUID_NOISE_PERIOD_PX,
  FLUID_NOISE_WARP_VELOCITY,
  FLUID_NOISE_WARP_WEIGHT,
  FLUID_PHASE_SCALE,
  FLUID_PUSH_PX,
  FLUID_QUALITY_TIERS,
  FLUID_REFERENCE_FPS,
  FLUID_RGB_SHIFT,
  FLUID_SHADE,
  FLUID_VELOCITY_DECAY,
  FLUID_WEIGHT_A_DECAY,
  FLUID_WEIGHT_B_DECAY,
  getFluidDisplaySize,
  getFluidScaledSize,
  getFrameDecay,
  type FluidLook,
} from '../../../lib/animations/fluid';
import {
  BLUR_SOURCE,
  DISPLAY_SOURCE,
  UPDATE_SOURCE,
  VERTEX_SOURCE,
} from './fluidShaders';

// 8 ビットのテクスチャの 1 段階．これ未満の速度・重みは 0 へ落とす（半精度でも同じ値でよい）
const BYTE_STEP = 1 / 255;
// 半精度で，これ未満の速度・重みを 0 へ落とす（小さな値が居座らないように）
const HALF_ZERO_CUT = 0.0008;
// 8 ビットのとき，これ未満の速度・重みを 0 へ落とす（0.5 を 0 とする表現の誤差を含む）
const BYTE_ZERO_CUT = 0.004;
// バッファの初期値（速度 0 = 0.5，重みは 0）
const FIELD_CLEAR: readonly [number, number, number, number] = [0.5, 0.5, 0, 0];

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
}

interface DoubleTarget {
  read: Target;
  write: Target;
}

interface TextureFormat {
  internalFormat: number;
  format: number;
  type: number;
  // 1 コマで必ず下げる量と，0 へ落とす境
  minStep: number;
  zeroCut: number;
}

// 1 コマぶんの入力（座標は CSS の px．左上原点．速度は画面の右・下が正）
export interface FluidFrame {
  dtSec: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  // 筆の半径（CSS の px）．止まっていれば 0
  brushRadiusPx: number;
  velocityX: number;
  velocityY: number;
}

export interface FluidEngine {
  // 品質の段階（FLUID_QUALITY_TIERS の添字）に合わせて，バッファと canvas の大きさを作り直す．中身は空になる
  resize: (viewportWidth: number, viewportHeight: number, tier: number) => boolean;
  // 1 コマ進めて，画面へ描く
  step: (frame: FluidFrame) => void;
  // バッファを空にして，透明な絵を出す
  clear: () => void;
  // 色の強さ（テーマの切り替えで呼ぶ）
  setLook: (look: FluidLook) => void;
  // バッファの精度（'half' = 半精度，'byte' = 8 ビット）
  precision: 'half' | 'byte';
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

function createTarget(gl: WebGL2RenderingContext, width: number, height: number, format: TextureFormat): Target | null {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, format.type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    return null;
  }
  gl.viewport(0, 0, width, height);
  gl.clearColor(...FIELD_CLEAR);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer, width, height };
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

// 半精度（RGBA16F）のテクスチャへ描けるなら半精度，だめなら 8 ビット（RGBA8．どの WebGL2 でも描ける）
function pickFieldFormat(gl: WebGL2RenderingContext): { format: TextureFormat; precision: 'half' | 'byte' } {
  const half: TextureFormat = {
    internalFormat: gl.RGBA16F,
    format: gl.RGBA,
    type: gl.HALF_FLOAT,
    minStep: 0,
    zeroCut: HALF_ZERO_CUT,
  };
  const hasExtension = Boolean(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  if (hasExtension) {
    const probe = createTarget(gl, 4, 4, half);
    if (probe) {
      deleteTarget(gl, probe);
      return { format: half, precision: 'half' };
    }
  }
  const byte: TextureFormat = {
    internalFormat: gl.RGBA8,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    minStep: BYTE_STEP,
    zeroCut: BYTE_ZERO_CUT,
  };
  return { format: byte, precision: 'byte' };
}

export function createFluidEngine(canvas: HTMLCanvasElement, initialLook: FluidLook): FluidEngine | null {
  try {
    return buildEngine(canvas, initialLook);
  } catch {
    return null;
  }
}

function buildEngine(canvas: HTMLCanvasElement, initialLook: FluidLook): FluidEngine | null {
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

  const { format, precision } = pickFieldFormat(gl);

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  if (!vertexShader) return null;
  const updateProgram = createProgram(gl, vertexShader, UPDATE_SOURCE);
  const blurProgram = createProgram(gl, vertexShader, BLUR_SOURCE);
  const displayProgram = createProgram(gl, vertexShader, DISPLAY_SOURCE);
  gl.deleteShader(vertexShader);
  if (!updateProgram || !blurProgram || !displayProgram) return null;

  // 速度と重みのバッファ（1/4 解像度．前のコマ／今のコマ），横ぼかしの途中，ぼかした写し（1/8 解像度）
  let field: DoubleTarget | null = null;
  let blurMid: Target | null = null;
  let blurred: Target | null = null;
  let viewportWidth = 1;
  let viewportHeight = 1;
  // バッファの 1 画素の，CSS の px（= 品質の段階の bufferDivisor）
  let bufferDivisor: number = FLUID_QUALITY_TIERS[0].bufferDivisor;
  let look = initialLook;
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
    deleteTarget(gl, field?.read);
    deleteTarget(gl, field?.write);
    deleteTarget(gl, blurMid);
    deleteTarget(gl, blurred);
    field = null;
    blurMid = null;
    blurred = null;
  };

  const clearTarget = (target: Target | null | undefined) => {
    if (!target) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.clearColor(...FIELD_CLEAR);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const resize = (width: number, height: number, tier: number): boolean => {
    if (isDisposed || gl.isContextLost()) return false;
    const quality = FLUID_QUALITY_TIERS[Math.min(Math.max(tier, 0), FLUID_QUALITY_TIERS.length - 1)];
    viewportWidth = Math.max(1, width);
    viewportHeight = Math.max(1, height);
    bufferDivisor = quality.bufferDivisor;
    const fieldSize = getFluidScaledSize(viewportWidth, viewportHeight, bufferDivisor);
    const blurSize = getFluidScaledSize(viewportWidth, viewportHeight, bufferDivisor * FLUID_BLUR_DIVISOR_RATIO);
    releaseTargets();
    const read = createTarget(gl, fieldSize.width, fieldSize.height, format);
    const write = createTarget(gl, fieldSize.width, fieldSize.height, format);
    blurMid = createTarget(gl, blurSize.width, blurSize.height, format);
    blurred = createTarget(gl, blurSize.width, blurSize.height, format);
    if (!read || !write || !blurMid || !blurred) {
      deleteTarget(gl, read);
      deleteTarget(gl, write);
      releaseTargets();
      return false;
    }
    field = { read, write };
    // canvas は画面の 1/2 以下の解像度で描き，CSS で拡大する（やわらかい絵なので粗さは目立たない）
    const displaySize = getFluidDisplaySize(viewportWidth, viewportHeight, quality.displayScale);
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    return true;
  };

  const step = (frame: FluidFrame) => {
    if (isDisposed || gl.isContextLost() || !field || !blurMid || !blurred) return;
    const dtSec = frame.dtSec;
    const dtFrames = dtSec * FLUID_REFERENCE_FPS;
    const fieldSize = field.read;

    // 1. 更新
    gl.useProgram(updateProgram.program);
    const update = updateProgram.uniforms;
    bindTexture(updateProgram, 'uPrevious', 0, field.read.texture);
    bindTexture(updateProgram, 'uBlurred', 1, blurred.texture);
    gl.uniform2f(update.uSize, fieldSize.width, fieldSize.height);
    // 画面の座標（左上原点）→ バッファの画素（左下原点）．画素の大きさが違う分は，画面に対する割合でそろえる
    const toBufferX = fieldSize.width / viewportWidth;
    const toBufferY = fieldSize.height / viewportHeight;
    gl.uniform2f(update.uFrom, frame.fromX * toBufferX, (viewportHeight - frame.fromY) * toBufferY);
    gl.uniform2f(update.uTo, frame.toX * toBufferX, (viewportHeight - frame.toY) * toBufferY);
    gl.uniform1f(update.uRadius, frame.brushRadiusPx * toBufferX);
    gl.uniform2f(update.uVelocity, frame.velocityX, -frame.velocityY);
    gl.uniform3f(
      update.uDecay,
      getFrameDecay(FLUID_VELOCITY_DECAY, dtSec),
      getFrameDecay(FLUID_WEIGHT_A_DECAY, dtSec),
      getFrameDecay(FLUID_WEIGHT_B_DECAY, dtSec),
    );
    // 長さは CSS の px で持ち，バッファの画素に直す．移す量は 1 コマぶんなので，経過時間で補正する
    gl.uniform1f(update.uPush, (FLUID_PUSH_PX / bufferDivisor) * dtFrames);
    gl.uniform1f(update.uNoiseScale, bufferDivisor / FLUID_NOISE_PERIOD_PX);
    gl.uniform1f(update.uNoiseGain, (FLUID_NOISE_GAIN_PX / bufferDivisor) * dtFrames);
    gl.uniform2f(update.uNoiseWarp, FLUID_NOISE_WARP_VELOCITY, FLUID_NOISE_WARP_WEIGHT);
    gl.uniform1f(update.uMinStep, format.minStep);
    gl.uniform1f(update.uZeroCut, format.zeroCut);
    draw(field.write);
    swap(field);

    // 2. 横ぼかし（1/4 → 1/8）  3. 縦ぼかし（1/8）
    const blurTexelPx = bufferDivisor * FLUID_BLUR_DIVISOR_RATIO;
    const sigmaTexels = (FLUID_BLUR_RADIUS_PX / blurTexelPx) * FLUID_BLUR_SIGMA_RATIO;
    gl.useProgram(blurProgram.program);
    gl.uniform1f(blurProgram.uniforms.uSigma, sigmaTexels);
    bindTexture(blurProgram, 'uSource', 0, field.read.texture);
    gl.uniform2f(blurProgram.uniforms.uStep, 1 / blurMid.width, 0);
    draw(blurMid);
    bindTexture(blurProgram, 'uSource', 0, blurMid.texture);
    gl.uniform2f(blurProgram.uniforms.uStep, 0, 1 / blurred.height);
    draw(blurred);

    // 4. 表示
    gl.useProgram(displayProgram.program);
    const display = displayProgram.uniforms;
    bindTexture(displayProgram, 'uField', 0, field.read.texture);
    gl.uniform1f(display.uPhaseScale, FLUID_PHASE_SCALE);
    gl.uniform1f(display.uRgbShift, FLUID_RGB_SHIFT);
    gl.uniform1f(display.uShade, FLUID_SHADE);
    gl.uniform1f(display.uFalloffStart, FLUID_FALLOFF_START);
    gl.uniform1f(display.uFalloffEnd, FLUID_FALLOFF_END);
    gl.uniform1f(display.uColorMultiplier, look.colorMultiplier);
    gl.uniform1f(display.uSaturation, look.saturation);
    draw(null);
  };

  const clear = () => {
    if (isDisposed || gl.isContextLost()) return;
    clearTarget(field?.read);
    clearTarget(field?.write);
    clearTarget(blurMid);
    clearTarget(blurred);
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
    [updateProgram, blurProgram, displayProgram].forEach((entry) => gl.deleteProgram(entry.program));
  };

  return {
    resize,
    step,
    clear,
    setLook: (next) => { look = next; },
    precision,
    isContextLost: () => gl.isContextLost(),
    dispose,
  };
}
