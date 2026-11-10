// 流体の背景のシェーダー（WebGL2 / GLSL ES 3.00）．
// 安定流体（Stam, 1999）の手順を，速度場と染料のテクスチャに対する全画面の描画として書いている．
// 速度は「マス／秒」（速度場の 1 マスを 1 とする），染料は R = 濃さ，G = 濃さ × 色相（0〜1．虹色の位相のずれ）．

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

// 1 か所へ，ガウスの形で値を足す．足したあとの大きさ（成分の最大値）を uCap までに収め，向き・比率は保つ
export const SPLAT_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;
uniform float uCap;
void main() {
  vec2 offset = vUv - uPoint;
  offset.x *= uAspect;
  float weight = exp(-dot(offset, offset) / (2.0 * uRadius * uRadius));
  vec4 result = texture(uTarget, vUv) + vec4(uValue * weight, 0.0);
  float largest = max(abs(result.x), abs(result.y));
  result.xy *= min(1.0, uCap / max(largest, 1e-5));
  outColor = vec4(result.xy, 0.0, 1.0);
}`;

// 速度に沿って，1 コマ前の場所から値を運んでくる（半ラグランジュ移流）．同時に薄れさせ，小さな値は 0 へ落とす
export const ADVECTION_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform float uDecay;
uniform float uFloor;
void main() {
  vec2 origin = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  vec2 carried = texture(uSource, origin).xy * uDecay;
  if (abs(carried.x) + abs(carried.y) < uFloor) {
    carried = vec2(0.0);
  }
  outColor = vec4(carried, 0.0, 1.0);
}`;

// 速度の発散（湧き出し・吸い込み）
export const DIVERGENCE_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`;

// 圧力のポアソン方程式を解くヤコビ反復の 1 回
export const PRESSURE_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
void main() {
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

// 速度から圧力の勾配を引いて，発散のない場にする
export const GRADIENT_SUBTRACT_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}`;

// 速度の回転（渦度）
export const CURL_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  outColor = vec4(0.5 * ((right - left) - (top - bottom)), 0.0, 0.0, 1.0);
}`;

// 渦度の強いところへ回転の力を足して，数値的に失われる渦を戻す（渦度の閉じ込め）
export const VORTICITY_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uDt;
void main() {
  float left = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float bottom = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float top = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float center = texture(uCurl, vUv).x;
  vec2 gradient = 0.5 * vec2(abs(right) - abs(left), abs(top) - abs(bottom));
  vec2 direction = gradient / (length(gradient) + 1e-4);
  vec2 force = uStrength * center * vec2(direction.y, -direction.x);
  outColor = vec4(texture(uVelocity, vUv).xy + force * uDt, 0.0, 1.0);
}`;

// 値に係数を掛けて写す（前のコマの圧力を，少し弱めて次の反復の初期値にする）
export const SCALE_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uSource;
uniform float uScale;
void main() {
  outColor = vec4(texture(uSource, vUv).x * uScale, 0.0, 0.0, 1.0);
}`;

// 染料を画面へ出す．Lusion の「screen paint」に合わせ，色を塗るのではなく，流れ（速度）が作る薄い虹色の膜に見せる．
//   ・色は染料の色ではなく，速度の向き・大きさの変化で位相が進む虹色（Lusion の sin(vel * 40 + vec3(0, 2, 4) * shift) と同じ考え方）
//   ・動きが速いところほど膜がはっきりし，止まった所は淡く透ける
//   ・濃い中心は白く淡いパステル，薄い縁ほど虹色が強い（シャボン玉の縁）
// 濃さは指数で飽和させ（最大でも uMaxAlpha），ごく小さなディザで段を消す．出力は乗算済みアルファ（canvas の既定）
export const DISPLAY_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform float uMaxAlpha;
uniform float uVisible;
uniform float uVelocityScale;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec2 dye = texture(uDye, vUv).xy;
  float density = max(dye.x - uVisible, 0.0);
  if (density <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  float hue = clamp(dye.y / max(dye.x, 1e-4), 0.0, 1.0);
  float body = 1.0 - exp(-density * 2.4);
  // 速度（マス／秒）を，ほぼ -1〜1 にそろえる
  vec2 velocity = texture(uVelocity, vUv).xy * uVelocityScale;
  float speed = clamp(length(velocity) * 2.5, 0.0, 1.0);
  // 速度の変化で位相が進む虹色．濃さと色相でもゆっくりずれる
  float phase = (velocity.x + velocity.y) * 14.0 + body * 2.5 + hue * 2.0;
  vec3 film = 0.5 + 0.5 * sin(phase + vec3(0.0, 2.1, 4.2));
  // 中心は淡く白っぽく，縁ほど虹色を強く
  float rim = 1.0 - body;
  vec3 color = mix(vec3(1.0), film, 0.35 + 0.55 * rim * (0.4 + 0.6 * speed));
  color = mix(color, mix(uColorPrimary, uColorSecondary, hue), 0.12);
  float alpha = body * mix(0.35, 1.0, speed) * uMaxAlpha;
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(color * alpha + dither, max(alpha + dither, 0.0));
}`;


// 画面を歪ませるための「ずらしの地図」（SVG の feDisplacementMap の入力）を作る．
// R・G = 0.5 + ずらす向き（流れの速度 × 染料の濃さ），B = 0.5．何もない所は 0.5（ずらさない）．
// 画面の座標は下向きが正なので，y を反転して読む（G も反転）．小さな RGBA8 の対象へ描き，JS で読み出す
export const DISPLACEMENT_SOURCE = `${FRAGMENT_HEADER}
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform float uVisible;
uniform float uVelocityScale;
uniform float uGain;
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float density = max(texture(uDye, uv).x - uVisible, 0.0);
  float weight = 1.0 - exp(-density * 3.5);
  vec2 velocity = texture(uVelocity, uv).xy * uVelocityScale;
  vec2 shift = clamp(velocity * weight * uGain, -1.0, 1.0);
  outColor = vec4(0.5 + 0.5 * shift.x, 0.5 - 0.5 * shift.y, 0.5, 1.0);
}`;
