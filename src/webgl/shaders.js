const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

export const blobVertex = /* glsl */ `
  ${noise}

  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uForce;
  uniform float uVelocity;

  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vView;
  varying float vLift;

  vec3 displace(vec3 pos) {
    float t = uTime * 0.32;
    float n = fbm(pos * 1.15 + vec3(t * 0.35, t * 0.22, t * 0.18));
    float breath = 0.08 + 0.04 * sin(uTime * 0.7);
        vec3 d = pos + normalize(pos) * (n * 0.2 + breath);

    float dist = length(pos - uMouse);
    float falloff = exp(-dist * dist * 0.42);
    vec3 pull = (uMouse - pos) * falloff * uForce;
    d += pull + normalize(pos) * falloff * (0.18 + uVelocity * 0.4);
    return d;
  }

  void main() {
    vec3 p = displace(position);
    vec3 t = displace(position + vec3(0.012, 0.0, 0.0));
    vec3 b = displace(position + vec3(0.0, 0.012, 0.0));
    vec3 n = normalize(cross(t - p, b - p));

    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    vView = cameraPosition - world.xyz;
    vLift = length(p - position);

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const blobFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uVelocity;

  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vView;
  varying float vLift;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    float ndv = max(dot(n, v), 0.0);
    float fresnel = pow(1.0 - ndv, 3.0);

    vec3 l = normalize(vec3(0.55, 0.85, 0.45));
    float diff = max(dot(n, l), 0.0);
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 42.0);

    vec3 warm = vec3(1.0, 0.78, 0.48);
    vec3 cool = vec3(0.35, 0.66, 0.95);
    vec3 rose = vec3(0.82, 0.32, 0.46);
    float irid = sin(dot(n, vec3(0.45, 0.7, 0.15)) * 7.2 + uTime * 0.5) * 0.5 + 0.5;
    vec3 film = mix(cool, rose, irid);

    float prox = exp(-length(vWorld - uMouse) * 1.05);
    vec3 color = vec3(0.018, 0.02, 0.03);
    color += vec3(0.05, 0.052, 0.06) * diff;
    color += film * fresnel * 0.95;
    color += warm * spec * 0.85;
    color += warm * prox * (0.16 + uVelocity * 0.3);
    color += vec3(0.08, 0.06, 0.05) * vLift;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export const particleVertex = /* glsl */ `
  ${noise}

  uniform float uTime;
  uniform vec3 uMouse;
  uniform float uVelocity;

  attribute float aSeed;

  varying float vAlpha;

  void main() {
    float t = uTime * (0.12 + aSeed * 0.18);
    vec3 p = position;
    p += vec3(
      snoise(position + vec3(t, aSeed, 0.0)),
      snoise(position + vec3(0.0, t, aSeed)),
      snoise(position + vec3(aSeed, 0.0, t))
    ) * 0.22;

    vec3 toMouse = uMouse - p;
    float dist = length(toMouse);
    p += normalize(toMouse + 0.0001) * exp(-dist * 0.7) * (0.35 + uVelocity);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (1.6 + aSeed * 2.2) * (90.0 / max(-mv.z, 1.2));
    gl_PointSize = clamp(size, 1.0, 5.0);
    vAlpha = smoothstep(6.5, 1.4, dist) * (0.16 + aSeed * 0.28);
  }
`;

export const particleFragment = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.92, 0.86, 0.74) * glow, vAlpha * glow);
  }
`;

export const envVertex = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const envFragment = /* glsl */ `
  ${noise}

  uniform float uTime;
  uniform vec2 uMouse;

  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float n = fbm(dir * 2.2 + uTime * 0.04);
    vec3 deep = vec3(0.018, 0.020, 0.032);
    vec3 haze = vec3(0.055, 0.042, 0.058);
    vec3 tint = mix(deep, haze, smoothstep(-0.15, 0.65, n));

    float horizon = smoothstep(-0.2, 0.55, dir.y);
    tint = mix(vec3(0.012, 0.012, 0.016), tint, horizon);

    vec2 look = dir.xy - uMouse * 0.28;
    float glow = 0.04 / (0.55 + dot(look, look) * 3.2);
    tint += vec3(0.40, 0.30, 0.20) * glow;

    gl_FragColor = vec4(clamp(tint, 0.0, 0.12), 1.0);
  }
`;
