// 流体カーソルのシェーダー（WebGL2 / GLSL ES 3.00）．
// 流体の方程式は解かない．「画面に塗る速度のバッファ」を 1 枚持ち，それで色を足すだけ．
// バッファの 1 画素は RGBA：
//   xy … 速度（0.5 を 0 とする．±0.5 の範囲）
//   z  … 重み 1（ゆっくり薄れる）
//   w  … 重み 2（速く薄れる）

// 画面いっぱいの三角形 1 枚（頂点バッファなし．gl_VertexID から作る）
export const VERTEX_SOURCE = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
`;

// 1 コマの更新（バッファを 1 回だけ描く）：
//   1. ぼかした低解像度の写しの速度で，前のコマを「来た方向」から読む（自分で自分を運ぶ）．
//      さらに，勾配ノイズの微分を，重みに比例して足す（煙のようにうねる細い舌になる）
//   2. 速度を薄れさせる（経過時間で補正した倍率．低い精度のテクスチャでも，必ず 1 段階は下げる）
//   3. 筆：前のコマと今のコマのマウス位置を結ぶ線分までの距離で，速度と重みを足す
export const UPDATE_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uPrevious;
uniform sampler2D uBlurred;
// バッファの大きさ（画素）
uniform vec2 uSize;
// 筆：前のコマ・今のコマの位置（バッファの画素．左下原点）と半径（バッファの画素）
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
// 慣性つきの速度（左下原点の向き．±0.5）
uniform vec2 uVelocity;
// 薄れの倍率：x = 速度，y = 重み 1，z = 重み 2
uniform vec3 uDecay;
// 速度 1 あたりに読みにいく距離（バッファの画素．経過時間で補正済み）
uniform float uPush;
// 勾配ノイズ：1 画素あたりの周期の数，微分に掛ける倍率（バッファの画素．経過時間で補正済み）
uniform float uNoiseScale;
uniform float uNoiseGain;
// ノイズの位置を，速度・重みで歪める大きさ（ノイズの周期を 1 とする）
uniform vec2 uNoiseWarp;
// 低い精度のテクスチャで，薄れが止まらないよう，1 コマで必ず下げる量．これ未満は 0 へ落とす
uniform float uMinStep;
uniform float uZeroCut;

const float ZERO = 0.5;

// 整数のハッシュ（格子点ごとの勾配の向きを決める）
float hashAngle(ivec2 cell) {
  uvec2 v = uvec2(cell + ivec2(4096));
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return float((v.x ^ v.y) & 65535u) / 65536.0 * 6.2831853;
}

vec2 gradientAt(ivec2 cell) {
  float angle = hashAngle(cell);
  return vec2(cos(angle), sin(angle));
}

// 勾配ノイズと，その微分（x = 値，yz = 微分）
vec3 gradientNoise(vec2 point) {
  ivec2 cell = ivec2(floor(point));
  vec2 local = fract(point);
  vec2 fade = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);
  vec2 fadeSlope = 30.0 * local * local * (local * (local - 2.0) + 1.0);
  vec2 g00 = gradientAt(cell);
  vec2 g10 = gradientAt(cell + ivec2(1, 0));
  vec2 g01 = gradientAt(cell + ivec2(0, 1));
  vec2 g11 = gradientAt(cell + ivec2(1, 1));
  float v00 = dot(g00, local);
  float v10 = dot(g10, local - vec2(1.0, 0.0));
  float v01 = dot(g01, local - vec2(0.0, 1.0));
  float v11 = dot(g11, local - vec2(1.0, 1.0));
  float cross = v00 - v10 - v01 + v11;
  float value = v00 + fade.x * (v10 - v00) + fade.y * (v01 - v00) + fade.x * fade.y * cross;
  vec2 slope = g00 + fade.x * (g10 - g00) + fade.y * (g01 - g00) + fade.x * fade.y * (g00 - g10 - g01 + g11)
    + fadeSlope * (fade.yx * cross + vec2(v10, v01) - v00);
  return vec3(value, slope);
}

float capsuleDistance(vec2 point, vec2 a, vec2 b) {
  vec2 pa = point - a;
  vec2 ba = b - a;
  float along = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * along);
}

void main() {
  vec2 pixel = vUv * uSize;
  vec2 texel = 1.0 / uSize;
  vec4 here = texture(uPrevious, vUv);

  // 1. 運ぶ：ぼかした写しの速度の，逆向きから読む
  vec2 blurredVelocity = texture(uBlurred, vUv).xy - ZERO;
  vec2 shift = -blurredVelocity * uPush;
  // 細い舌：位置を重みと速度で少し歪めた勾配ノイズの微分を，重みに比例して足す
  vec2 warp = (here.xy - ZERO) * uNoiseWarp.x + here.zw * uNoiseWarp.y;
  vec3 noise = gradientNoise(pixel * uNoiseScale + warp);
  shift += noise.yz * (here.z + here.w) * uNoiseGain;
  vec4 carried = texture(uPrevious, vUv + shift * texel);

  // 2. 薄れ：符号のある速度も，絶対値で薄れさせる
  vec4 before = vec4(carried.xy - ZERO, carried.zw);
  vec4 factor = vec4(uDecay.x, uDecay.x, uDecay.y, uDecay.z);
  vec4 magnitude = abs(before);
  vec4 faded = min(magnitude * factor, max(magnitude - uMinStep, 0.0));
  faded *= step(uZeroCut, faded);
  vec4 value = sign(before) * faded;

  // 3. 筆：線分（カプセル）までの距離で，1 - smoothstep(0, 半径, 距離)．止まっていれば半径 0 で何も足さない
  float brush = 0.0;
  if (uRadius > 1e-4) {
    brush = 1.0 - smoothstep(0.0, uRadius, capsuleDistance(pixel, uFrom, uTo));
  }
  value.xy += uVelocity * brush;
  value.zw += brush;

  outColor = clamp(vec4(value.xy + ZERO, value.zw), 0.0, 1.0);
}`;

// ガウスぼかしの 1 方向（片側 8 タップ．標準偏差 uSigma は，タップ数の 1/3 前後を渡す）．
// 1 回目は 1/4 解像度のバッファを 1/8 解像度へ読み取りながらぼかす（縮小を兼ねる）
export const BLUR_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uSource;
// 1 タップの間隔（出力の 1 画素ぶん．向きを持つ）
uniform vec2 uStep;
uniform float uSigma;
const int TAPS = 8;
void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  float inverseVariance = 0.5 / max(uSigma * uSigma, 1e-4);
  for (int index = -TAPS; index <= TAPS; index++) {
    float weight = exp(-float(index * index) * inverseVariance);
    sum += texture(uSource, vUv + uStep * float(index)) * weight;
    total += weight;
  }
  outColor = sum / total;
}`;

// 表示：速度と重みから，位相の違う正弦で色を足す（淡い虹色の干渉縞）．
// 足す色 c（RGB．正負あり）を，乗算済みアルファの canvas へ，合成結果が「背景 + c」になるように出す：
//   a = max(0, −min(c))，rgb = c + a，alpha = a  →  結果 = rgb + 背景 × (1 − a)（背景が白なら，ちょうど 背景 + c）
export const DISPLAY_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uField;
uniform float uPhaseScale;
uniform float uRgbShift;
uniform float uShade;
uniform float uFalloffStart;
uniform float uFalloffEnd;
uniform float uColorMultiplier;
uniform float uSaturation;

// 始点 > 終点でも決まる smoothstep（GLSL の smoothstep は，始点 >= 終点だと未定義）
float falloff(float edge0, float edge1, float value) {
  float t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// 段（バンド）を消す，ごく小さなディザ（画素の位置から作る）
float dither(vec2 fragment) {
  return fract(52.9829189 * fract(dot(fragment, vec2(0.06711056, 0.00583715)))) - 0.5;
}

void main() {
  vec4 field = texture(uField, vUv);
  float weight = (field.z + field.w) * 0.5;
  vec2 velocity = (0.5 - field.xy) * 2.0 * weight;
  vec3 phase = vec3(velocity.x + velocity.y) * uPhaseScale + vec3(0.0, 2.0, 4.0) * uRgbShift;
  float strength = falloff(uFalloffStart, uFalloffEnd, weight) * uShade * max(abs(velocity.x), abs(velocity.y)) * uColorMultiplier;
  vec3 color = sin(phase) * strength;
  // 彩度：1 で正弦のまま，小さいほど 3 成分の平均（白っぽい光）へ寄せる
  color = mix(vec3((color.r + color.g + color.b) / 3.0), color, uSaturation);

  float alpha = clamp(max(0.0, -min(color.r, min(color.g, color.b))), 0.0, 1.0);
  vec3 premultiplied = color + alpha;

  // 何も描いていない所へはディザを足さない
  float visible = smoothstep(0.0, 0.004, strength);
  premultiplied += dither(gl_FragCoord.xy) * (1.0 / 255.0) * visible;
  outColor = vec4(clamp(premultiplied, 0.0, 1.0), alpha);
}`;
