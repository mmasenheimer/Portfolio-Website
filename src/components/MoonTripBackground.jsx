import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

// LiDAR-style canyon scan: scattered points over a winding canyon. Its floor
// is strewn with boulders, rubble and cracks; its walls lean, bulge and
// overhang, with ledges, fissures and the odd cave; the rim is broken into
// cracked rock slabs; ragged crags and twisted spires jut up along the edge;
// and crooked trees grow all around. Points are coloured by how much their
// surface faces the light: lit faces glow green, the rest fall off to teal
// and navy. The camera follows the canyon, cruising above the rim and now
// and then dropping down to fly between the walls.

// How fast the landscape flows toward the camera (units per second). Shared
// with the shaders so the camera can keep tracking the canyon as it moves.
const TRAVEL = 0.25;

// Shared by all the vertex shaders
const common = /* glsl */ `
  uniform float uTime;

  const float TAU = 6.2831853;
  const float TRAVEL = ${TRAVEL.toFixed(4)};
  const float CRAG_PERIOD = 9.0;  // spacing between crags along the canyon

  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;
  varying float vShade;
  varying float vVisible;

  // ---- noise ---------------------------------------------------------
  // "Hash without Sine" by Dave Hoskins (MIT) - cheap, and stable on all GPUs
  vec2 hash01(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  vec2 hash2(vec2 p) {
    return hash01(p) * 2.0 - 1.0;
  }

  // 2D gradient noise, roughly [-0.7, 0.7]
  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Ridged multifractal: sharp crests, detail piled onto the high ground.
  float ridged(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    float prev = 1.0;
    for (int i = 0; i < 4; i++) {
      float n = 1.0 - clamp(abs(gnoise(p * freq)) * 1.6, 0.0, 1.0);
      n *= n;
      sum += n * amp * prev;
      prev = n;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum; // ~[0, 1]
  }

  // Voronoi: the nearest cell (id + centre), plus the distances to the
  // nearest and second-nearest centres. Where those two are nearly equal
  // we're on a boundary between cells - used for cracks.
  vec2 voronoi(vec2 p, out vec2 cellId, out vec2 cellPos) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    cellId = n;
    cellPos = n;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash01(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          cellId = n + g;
          cellPos = n + g + o;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return sqrt(vec2(d1, d2));
  }

  // ---- canyon --------------------------------------------------------
  // q is "terrain space": x across the canyon, y along it. The whole
  // landscape slides toward the camera: world z = q.y + uTime * TRAVEL.

  // (mirrored in JS below so the camera can follow it)
  float canyonCenter(float z) {
    return sin(z * 0.18) * 1.0 + sin(z * 0.07 + 1.3) * 0.6;
  }

  float canyonHalfWidth(float z) {
    return 1.6 + gnoise(vec2(z * 0.15, 3.7)) * 0.6;
  }

  // Distance from the canyon's centreline, warped by noise so the rim zigzags
  float canyonDistance(vec2 q) {
    return abs(q.x - canyonCenter(q.y)) + gnoise(q * 0.9) * 0.6 + gnoise(q * 2.3) * 0.25;
  }

  // Canyon floor: broad swells, rubble, talus piled at the foot of the
  // walls, scattered boulders, little bumps and winding cracks
  float floorHeight(vec2 q, float d, float halfWidth) {
    float h = 0.1 + gnoise(q * 0.22) * 0.25;            // broad swells and dips
    h += ridged(q * 0.6) * 0.3;                          // rubbly ridges
    h += smoothstep(halfWidth - 0.9, halfWidth, d)       // talus against the walls
      * (0.25 + gnoise(q * 1.7) * 0.2);

    // Boulders: lumpy mounds in about half the cells of a warped grid, kept
    // small down the middle where the camera flies
    vec2 cellId;
    vec2 cellPos;
    vec2 bp = q * 1.1 + vec2(gnoise(q * 2.0), gnoise(q * 2.0 + 3.1)) * 0.25;
    vec2 f = voronoi(bp, cellId, cellPos);
    vec2 bh = hash01(cellId + 11.7);
    float radius = 0.2 + bh.x * 0.3;
    float k = f.x / radius;
    float lump = sqrt(max(0.0, 1.0 - k * k));
    h += step(bh.y, 0.5) * lump * radius * (0.5 + bh.y)
      * mix(0.25, 1.0, smoothstep(0.35, 1.0, d));

    h += max(0.0, gnoise(q * 5.5)) * 0.12;               // little bumps
    h += gnoise(q * 11.0) * 0.03;                        // grit

    // Cracks: narrow channels along a warped noise contour
    float crack = gnoise(q * 0.7 + vec2(gnoise(q * 1.9), gnoise(q * 1.9 + 7.0)) * 0.6);
    h -= (1.0 - smoothstep(0.0, 0.035, abs(crack))) * 0.3;
    return h;
  }

  // Rim: tilted rock slabs from a warped Voronoi pattern (so the fractures
  // wander instead of running straight), big and little bumps, and narrow
  // crevices along the fractures
  float rimHeight(vec2 q, float d, float halfWidth) {
    vec2 cellId;
    vec2 cellPos;
    vec2 s = q * 0.55 + vec2(gnoise(q * 1.1), gnoise(q * 1.1 + 5.2)) * 0.35;
    vec2 f = voronoi(s, cellId, cellPos);
    vec2 tilt = hash01(cellId) * 2.0 - 1.0;
    float h = 2.3
      + hash01(cellId + 7.3).x * 0.9                     // per-slab height
      + dot(s - cellPos, tilt) * 0.7;                    // per-slab tilt
    h += (d - halfWidth) * 0.12;                         // keeps rising away from the canyon
    h += ridged(q * 0.8) * 0.4;                          // weathered tops
    h += gnoise(q * 0.35) * 0.35;                        // big bumps
    h += max(0.0, gnoise(q * 3.3)) * 0.12;               // little bumps
    h += gnoise(q * 4.0) * 0.06 + gnoise(q * 9.0) * 0.025;
    h -= (1.0 - smoothstep(0.0, 0.06, f.y - f.x)) * 0.5; // crevices between slabs
    return h;
  }

  // Ground height without the crags
  float baseHeight(vec2 q) {
    float d = canyonDistance(q);
    float halfWidth = canyonHalfWidth(q.y);
    // 0 on the canyon floor, 1 up on the rim - a very steep step = cliff wall
    float wall = smoothstep(halfWidth, halfWidth + 0.3, d);
    float h = 0.0;
    if (wall < 1.0) h += (1.0 - wall) * floorHeight(q, d, halfWidth);
    if (wall > 0.0) h += wall * rimHeight(q, d, halfWidth);
    return h;
  }

  // ---- crags ---------------------------------------------------------
  // Landmarks spaced along the canyon, alternating sides, up on the rim.
  // Most are broad, ragged rock blocks; the rest are big lone trees.
  struct Crag {
    vec2 center;  // terrain space
    float radius;
    float top;
    float side;   // -1 = left of the canyon, +1 = right
    float seed;
    float tree;   // 1 = a big lone tree stands here instead of rock
    float taper;  // how much it narrows toward the top
    vec2 lean;    // how far the top is shifted from the base (away from the canyon)
  };

  Crag cragAt(float k) {
    vec2 h = hash01(vec2(k, 17.0));
    vec2 h2 = hash01(vec2(k, 29.0));
    vec2 h3 = hash01(vec2(k, 41.0));
    Crag c;
    c.seed = k;
    c.side = mod(k, 2.0) < 0.5 ? -1.0 : 1.0;
    // ~28% are trees, well mixed along the canyon (the first one ahead at
    // the start is a tree)
    c.tree = 1.0 - step(0.3, hash01(vec2(k * 8.18 + 2.0, k * 12.89 + 61.0)).y);
    c.radius = 1.5 + h.y * 0.6;
    c.top = 3.6 + h.x * 0.6;
    c.taper = 0.05 + h2.y * 0.25;
    // lean outward (never over the canyon, so the camera's path stays clear)
    c.lean = vec2(c.side * h3.x * 0.5, (h3.y - 0.5) * 0.6);
    float z = k * CRAG_PERIOD + (h.x - 0.5) * 2.0;
    // Set back from the canyon edge far enough that even the most ragged
    // outline can't reach into the canyon, where the camera flies. Trees
    // stand a little back from the edge so their branches stay clear too.
    float setback = mix(c.radius * 1.7, 1.8, c.tree);
    c.center = vec2(canyonCenter(z) + c.side * (canyonHalfWidth(z) + setback), z);
    return c;
  }

  Crag nearestCrag(float z) {
    return cragAt(floor(z / CRAG_PERIOD + 0.5));
  }

  // A crag's cross-section: distance from its centre at angle theta and
  // height fraction y01 (0 = base, 1 = top). Layered noise keeps the outline
  // ragged, and it shifts with height so the walls bulge and overhang.
  float cragOutline(Crag c, float theta, float y01) {
    vec2 dir = vec2(cos(theta), sin(theta));
    float r = 1.0
      + gnoise(dir * 1.3 + c.seed * 7.7) * 0.45
      + gnoise(dir * 3.1 + vec2(c.seed * 3.3, y01 * 2.6)) * 0.3
      + gnoise(dir * 7.0 + vec2(c.seed * 1.7, y01 * 7.0)) * 0.12;
    r *= 1.0 - c.taper * y01;
    return c.radius * max(r, 0.3);
  }

  // Crag top: a tilted slab, highest along the canyon edge, with a broken,
  // jagged crest
  float cragTop(Crag c, vec2 q) {
    vec2 v = q - c.center - c.lean;
    float h = c.top - v.x * c.side * 0.35 + v.y * 0.1;
    h += ridged(q * 1.3 + c.seed) * 0.5;
    h += gnoise(q * 6.0) * 0.05;
    return h;
  }

  // Full terrain height (rock crags included) at a world ground position
  float heightAt(vec2 xz) {
    vec2 q = vec2(xz.x, xz.y - uTime * TRAVEL);
    float h = baseHeight(q);
    Crag c = nearestCrag(q.y);
    vec2 v = q - c.center - c.lean; // the top sits over the leaned-over centre
    float r = length(v);
    if (c.tree < 0.5 && r < c.radius * 2.0) {
      float edge = cragOutline(c, atan(v.y, v.x), 1.0);
      float inside = 1.0 - smoothstep(edge - 0.04, edge + 0.04, r); // near-vertical wall
      h = mix(h, max(h, cragTop(c, q)), inside);
    }
    return h;
  }

  // Key light from the front-left at a raking angle, so faces turned toward
  // the viewer glow green and bumps, ledges and boulders show their shape,
  // plus a weak fill from the right (like light bouncing off the far wall)
  // so rock in shadow still reads instead of going black
  float lightAmount(vec3 n) {
    float key = max(dot(n, normalize(vec3(-0.6, 0.45, 0.65))), 0.0);
    float fill = max(dot(n, normalize(vec3(0.7, 0.35, 0.3))), 0.0);
    return clamp(key + fill * 0.25, 0.0, 1.0);
  }

  // ---- trees ---------------------------------------------------------
  // Two unit vectors perpendicular to d (and to each other)
  void basis(vec3 d, out vec3 u, out vec3 v) {
    vec3 ref = abs(d.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    u = normalize(cross(d, ref));
    v = cross(d, u);
  }

  // A crooked limb: from s along dir for len, sagging by droop and
  // wandering a little; the point at fraction t of the way along
  vec3 limbPoint(vec3 s, vec3 dir, float len, float droop, float seed, float t) {
    vec3 u;
    vec3 v;
    basis(dir, u, v);
    vec3 p = s + dir * len * t;
    p.y -= droop * len * t * t;
    p += (u * gnoise(vec2(t * 3.0, seed)) + v * gnoise(vec2(t * 3.0, seed + 5.0))) * len * 0.15;
    return p;
  }

  // A point on a crooked tree growing from root: a leaning trunk, drooping
  // branches, 2-3 twigs per branch and loose leaf clumps at the twig tips.
  // tseed picks its shape, size scales it and extra adds branches. part
  // (0-1) picks trunk / branch / twig / leaves, t is how far along that
  // limb, and pick holds the rest: x - which branch, y - which twig,
  // z - angle around the limb, w - leaf scatter. n gets the surface normal.
  vec3 treePoint(vec3 root, float tseed, float size, float extra, float part, float t, vec4 pick, out vec3 n) {
    vec2 h1 = hash01(vec2(tseed, 41.0));
    vec2 h2 = hash01(vec2(tseed, 87.0));
    vec2 h3 = hash01(vec2(tseed, 133.0));
    float trunkLen = 0.9 * size;
    vec3 trunkDir = normalize(vec3((h2.y - 0.5) * 0.5, 1.0, (h3.x - 0.5) * 0.5));
    float branches = 3.0 + floor(h3.y * 3.0) + extra;
    float spin = h1.x * TAU;

    // Pick the limb this point sits on: the trunk, a branch, or a twig
    vec3 s = root;
    vec3 dir = trunkDir;
    float len = trunkLen;
    float droop = 0.0;
    float seed = tseed;
    float thick = 0.045 * size;

    if (part >= 0.25) {
      float i = floor(pick.x * branches);
      vec2 bh = hash01(vec2(tseed, i + 1.0));
      float along = 0.35 + (i + 0.5 + (bh.x - 0.5) * 0.6) / branches * 0.6;
      float az = spin + (i + bh.y * 0.6) / branches * TAU;
      float el = 0.3 + bh.x * 0.7;
      s = limbPoint(root, trunkDir, trunkLen, 0.0, tseed, along);
      dir = vec3(cos(el) * cos(az), sin(el), cos(el) * sin(az));
      len = trunkLen * (0.45 + bh.y * 0.35) * (1.0 - 0.35 * (along - 0.35));
      droop = 0.1 + bh.y * 0.35;
      seed = tseed + i * 3.7;
      thick = 0.022 * size;

      if (part >= 0.65) {
        float twigs = 2.0 + floor(bh.x * 2.0);
        float j = floor(pick.y * twigs);
        vec2 th = hash01(vec2(seed, j + 20.0));
        float ut = 0.35 + (j + 0.5) / twigs * 0.6;
        vec3 u;
        vec3 v;
        basis(dir, u, v);
        s = limbPoint(s, dir, len, droop, seed, ut);
        dir = normalize(dir + (u * (th.x - 0.5) + v * (th.y - 0.5)) * 1.6 + vec3(0.0, 0.35, 0.0));
        len *= 0.35 + th.y * 0.3;
        droop = 0.15;
        seed += j * 5.3 + 11.0;
        thick = 0.011 * size;
      }
    }

    if (part >= 0.9) {
      // Leaves: a loose clump around the twig's tip
      vec3 tip = limbPoint(s, dir, len, droop, seed, 1.0);
      float ct = pick.w * 2.0 - 1.0;
      float phi = pick.z * TAU;
      float st = sqrt(max(0.0, 1.0 - ct * ct));
      n = vec3(st * cos(phi), ct, st * sin(phi));
      return tip + n * (0.08 + 0.1 * size) * pow(t, 0.33);
    }
    // On the limb's surface, thinning toward its end
    vec3 axisP = limbPoint(s, dir, len, droop, seed, t);
    vec3 axisD = normalize(limbPoint(s, dir, len, droop, seed, t + 0.03) - axisP);
    vec3 u;
    vec3 v;
    basis(axisD, u, v);
    float ang = pick.z * TAU;
    n = u * cos(ang) + v * sin(ang);
    return axisP + n * thick * (1.0 - 0.6 * t);
  }

  void emit(vec3 pos) {
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDepth = -mvPosition.z;
    gl_PointSize = clamp(18.0 / -mvPosition.z, 1.0, 10.0); // nearer = bigger
  }
`;

// Scattered points over the whole landscape
const terrainVertexShader =
  common +
  /* glsl */ `
  attribute float aRand;

  void main() {
    vec2 xz = position.xz;
    vec2 q = vec2(xz.x, xz.y - uTime * TRAVEL);

    // Height here and just around it, for the surface normal and step depth
    float e = 0.06;
    float h = heightAt(xz);
    float hx0 = heightAt(xz - vec2(e, 0.0));
    float hx1 = heightAt(xz + vec2(e, 0.0));
    float hz0 = heightAt(xz - vec2(0.0, e));
    float hz1 = heightAt(xz + vec2(0.0, e));
    vec3 n = normalize(vec3(hx0 - hx1, 2.0 * e, hz0 - hz1));

    // Scanned points sit on top of the ground, so steps and crevices would
    // look hollow. Where a neighbour is lower (this point is at the top of
    // a drop), sink the point a random way down the drop to fill the face.
    float fill = max(0.0, h - min(min(hx0, hx1), min(hz0, hz1)));

    float visible = 1.0;
    // The canyon walls have their own dense points, so skip the steep band
    float hw = canyonHalfWidth(q.y);
    float band = smoothstep(hw, hw + 0.3, canyonDistance(q));
    if (band > 0.03 && band < 0.97) visible = 0.0;
    Crag c = nearestCrag(q.y);
    vec2 vb = q - c.center;          // from the crag's base centre
    vec2 vt = q - c.center - c.lean; // from its (leaned-over) top centre
    float rb = length(vb);
    float rt = length(vt);
    if (c.tree < 0.5 && min(rb, rt) < c.radius * 2.0) {
      float baseEdge = cragOutline(c, atan(vb.y, vb.x), 0.0);
      float topEdge = cragOutline(c, atan(vt.y, vt.x), 1.0);
      // Skip points buried in the rock under a crag's sloping wall
      if (rb < baseEdge && rt > topEdge + 0.04) visible = 0.0;
      // Crags have their own wall points; filling down their edges here
      // would draw ruler-straight vertical lines
      if (rb < baseEdge + 0.15 || rt < topEdge + 0.15) fill = 0.0;
    }
    vec3 pos = vec3(xz.x, h - aRand * fill, xz.y);

    vLight = lightAmount(n);
    vHeight = h;
    vStrata = sin(pos.y * 26.0 + gnoise(xz * 1.5) * 4.0);
    vRand = aRand;
    vShade = 1.0 - smoothstep(8.0, 10.0, abs(xz.x)); // soften the patch's side edges
    vVisible = visible;
    emit(pos);
  }
`;

// Extra points packed onto the crags' walls and tops so they read as dense,
// solid rock (or, where a crag slot holds a tree, onto that big tree).
// Their positions come entirely from aSeed:
//   x - where the point rides in the looping band (picks which crag)
//   y - angle around the crag
//   z - height up the wall / distance in from the edge on the top
//   w - wall or top
const cragVertexShader =
  common +
  /* glsl */ `
  attribute vec4 aSeed;

  // Crag points ride along with the terrain inside a looping band of world
  // z, from beyond the fog to just behind the camera. A point's spot in the
  // band picks its crag, so every crag in view keeps its full set of points;
  // once a crag passes the camera its points recycle onto a far-off one.
  const float BAND_END = 14.0;
  const float BAND_LENGTH = 30.0;
  const float WALL_SHARE = 0.8;

  // A point on a crag's wall at angle theta and height fraction y01
  vec3 cragWallPoint(Crag c, float theta, float y01, float base, float top) {
    vec2 p = c.center + c.lean * y01 + vec2(cos(theta), sin(theta)) * cragOutline(c, theta, y01);
    return vec3(p.x, mix(base, top, y01), p.y);
  }

  void main() {
    float travel = uTime * TRAVEL;
    float bandZ = BAND_END - BAND_LENGTH + mod(aSeed.x * BAND_LENGTH + travel, BAND_LENGTH);
    Crag c = nearestCrag(bandZ - travel);

    vec3 p; // terrain space: (x, height, distance along the canyon)
    vec3 n;

    if (c.tree > 0.5) {
      // This slot holds a big lone tree instead of rock: spend the crag's
      // points on it, so it comes out dense and detailed
      vec3 root = vec3(c.center.x, baseHeight(c.center) - 0.05, c.center.y);
      vec4 pick = vec4(
        aSeed.y,
        fract(aSeed.y * 71.3 + aSeed.z * 13.1),
        fract(aSeed.z * 53.7 + aSeed.w * 17.9),
        fract(aSeed.y * 29.3 + aSeed.w * 91.1)
      );
      float size = 2.0 + hash01(vec2(c.seed, 7.0)).x * 0.6;
      p = treePoint(root, c.seed * 3.1 + 500.0, size, 2.0, aSeed.w, aSeed.z, pick, n);
      vLight = lightAmount(n);
      vHeight = p.y;
      vStrata = 0.0;
      vRand = fract(pick.z * 37.1 + aSeed.z * 11.3);
      vShade = 0.9;
      vVisible = 1.0;
      emit(vec3(p.x, p.y, p.z + travel));
      return;
    }

    float visible = 1.0;
    float shade = 1.0;

    if (aSeed.w < WALL_SHARE) {
      // ---- wall: bunch points onto the side facing the canyon and the
      // camera (the big visible face) and thin them out round the back
      float facing = atan(0.8, -c.side);
      float s = aSeed.y * 2.0 - 1.0;
      float theta = facing + 3.14159265 * s * (0.55 + 0.45 * s * s);
      vec2 dir = vec2(cos(theta), sin(theta));

      float base = baseHeight(c.center + dir * cragOutline(c, theta, 0.0));
      float top = cragTop(c, c.center + c.lean + dir * cragOutline(c, theta, 1.0));
      visible = step(0.05, top - base); // ground as high as the crag here: no wall

      float y01 = aSeed.z;
      p = cragWallPoint(c, theta, y01, base, top);

      // Normal from how the face runs around and up the crag
      float e = 0.02;
      vec3 around = cragWallPoint(c, theta + e, y01, base, top) - p;
      vec3 rise = cragWallPoint(c, theta, y01 + e, base, top) - p;
      n = normalize(cross(rise, around));
      if (dot(n.xz, dir) < 0.0) n = -n;

      // Dark fissures snaking up the face, cut back into the rock
      float fissure = abs(gnoise(dir * 3.0 + vec2(c.seed * 3.1, y01 * 0.8)));
      float crevice = 1.0 - smoothstep(0.0, 0.05, fissure);
      p.xz -= dir * crevice * 0.12;
      shade = 1.0 - 0.7 * crevice;

      // Scanner noise: a little in front of / behind the face
      p.xz += dir * (fract(aSeed.z * 53.7 + aSeed.y * 17.3) - 0.5) * 0.06;
    } else {
      // ---- top: spread across the footprint
      float theta = aSeed.y * TAU;
      vec2 q = c.center + c.lean + vec2(cos(theta), sin(theta)) * cragOutline(c, theta, 1.0) * sqrt(aSeed.z);
      float y = cragTop(c, q);
      visible = step(baseHeight(q), y);
      float e = 0.06;
      float dx = (cragTop(c, q + vec2(e, 0.0)) - y) / e;
      float dz = (cragTop(c, q + vec2(0.0, e)) - y) / e;
      n = normalize(vec3(-dx, 1.0, -dz));
      p = vec3(q.x, y, q.y);
    }

    vLight = lightAmount(n);
    vHeight = p.y;
    vStrata = sin(p.y * 26.0 + gnoise(p.xz * 1.5) * 4.0);
    vRand = fract(aSeed.y * 91.7 + aSeed.z * 13.3);
    vShade = shade;
    vVisible = visible;
    emit(vec3(p.x, p.y, p.z + travel));
  }
`;

// Dense points on the canyon's side walls, so they read as solid, varied
// rock - ledges, bulges, overhangs, fissures and caves - including when the
// camera drops down inside the canyon. Like the terrain points they stay at
// a fixed world z while the landscape slides past them.
//   aSeed.x - which side of the canyon
//   aSeed.y - height up the wall
//   aSeed.z - speckle
//   aSeed.w - scatter in front of / behind the face
const wallVertexShader =
  common +
  /* glsl */ `
  attribute vec4 aSeed;

  // How far the wall face sits back from its foot at height y: positive
  // digs into the rock, negative bulges out over the floor
  float wallProfile(float qz, float y, float side) {
    vec2 p = vec2(qz, y);
    // lean: some stretches slope back, others stand sheer
    float o = y * (0.08 + 0.08 * gnoise(vec2(qz * 0.2, side * 4.0)));
    o += gnoise(p * vec2(0.7, 0.9) + side * 9.1) * 0.35;   // big bulges and hollows
    o += gnoise(p * 3.2 + side * 2.3) * 0.07;              // little bumps
    // Ledges: rock layers that stick out or cut back by different amounts,
    // their edges wandering rather than running straight
    float layer = floor(y * 1.7 + gnoise(vec2(qz * 0.6, side)) * 0.8);
    float run = floor(qz * 0.5 + gnoise(vec2(y * 0.8, side + 2.0)) * 0.7);
    o += (hash01(vec2(layer + side * 17.0, run)).x - 0.5) * 0.22;
    return max(o, -0.12); // limit overhangs so the camera's path stays clear
  }

  void main() {
    float travel = uTime * TRAVEL;
    float z = position.z;
    float qz = z - travel;
    float side = aSeed.x < 0.5 ? -1.0 : 1.0;
    float halfWidth = canyonHalfWidth(qz);
    float wallD = halfWidth + 0.15; // middle of the wall's steep band

    // Find where the noise-warped wall foot is at this depth by solving
    // canyonDistance(x) = wallD with a few Newton steps
    float x = canyonCenter(qz) + side * wallD;
    for (int i = 0; i < 4; i++) {
      float f = canyonDistance(vec2(x, qz)) - wallD;
      float df = (canyonDistance(vec2(x + 0.01, qz)) - canyonDistance(vec2(x - 0.01, qz))) / 0.02;
      df = abs(df) < 0.2 ? side * 0.2 : df;
      x -= clamp(f / df, -0.4, 0.4);
    }
    vec2 q = vec2(x, qz);
    float d = canyonDistance(q);

    // Hide points where the solve missed (the wall folds back on itself)
    // or where a rock crag stands in front of the wall
    float visible = step(abs(d - wallD), 0.08);
    Crag c = nearestCrag(qz);
    vec2 cv = q - c.center;
    if (c.tree < 0.5 && length(cv) < cragOutline(c, atan(cv.y, cv.x), 0.0) + 0.1) visible = 0.0;

    // Which way the wall faces (into the canyon)
    float e = 0.03;
    vec2 n2 = -normalize(vec2(
      canyonDistance(q + vec2(e, 0.0)) - d,
      canyonDistance(q + vec2(0.0, e)) - d
    ));

    // Height up the wall, from the canyon floor to the rim
    float y = mix(floorHeight(q, d, halfWidth), rimHeight(q, d, halfWidth), aSeed.y);

    // Shape the face, and tilt its normal to match
    float off = wallProfile(qz, y, side);
    float ep = 0.05;
    float offY = (wallProfile(qz, y + ep, side) - off) / ep;
    float offZ = (wallProfile(qz + ep, y, side) - off) / ep;
    vec3 n = normalize(vec3(n2.x, offY, n2.y + offZ));
    float shade = 1.0;

    // Crevices: narrow fissures snaking up the wall
    float fissure = abs(gnoise(vec2(qz * 2.2 + gnoise(vec2(y * 0.9, qz * 0.5)) * 0.8, y * 0.35) + side * 5.0));
    float crevice = 1.0 - smoothstep(0.0, 0.04, fissure);
    off += crevice * 0.18;
    shade *= 1.0 - 0.75 * crevice;

    // Caves: here and there a ragged hollow opens in the wall
    float caveRun = floor(qz / 3.5);
    vec2 ca = hash01(vec2(caveRun, side * 7.0 + 3.0));
    vec2 cb = hash01(vec2(caveRun, side * 7.0 + 11.0));
    if (ca.x < 0.45) {
      vec2 mouthCenter = vec2((caveRun + 0.25 + ca.y * 0.5) * 3.5, 0.6 + cb.x * 1.3);
      vec2 mouthSize = vec2(0.25 + cb.y * 0.35, 0.2 + ca.y * 0.25);
      vec2 rel = (vec2(qz, y) - mouthCenter) / mouthSize;
      float mouth = length(rel) + gnoise(rel * 2.1 + caveRun) * 0.35;
      if (mouth < 1.0) {
        float depth = sqrt(1.0 - mouth * mouth);
        off += depth * (0.35 + cb.y * 0.4);
        shade *= 1.0 - 0.85 * depth;
        // thin out the inside so the opening reads as a dark hole
        visible *= step(depth * 0.7, aSeed.w);
      }
    }

    // Push back into the rock by the profile, plus a little scanner scatter
    vec2 xz = q - n2 * off + n2 * (aSeed.w - 0.5) * 0.06;
    // vertical streaks in the speckle, like mineral staining
    float streak = gnoise(vec2(qz * 6.0, y * 0.4) + side * 3.0);

    vLight = lightAmount(n);
    vHeight = y;
    vStrata = sin(y * 26.0 + gnoise(q * 1.5) * 4.0);
    vRand = clamp(aSeed.z * 0.7 + streak * 0.6 + 0.15, 0.0, 1.0);
    vShade = shade;
    vVisible = visible;
    emit(vec3(xz.x, y, xz.y + travel));
  }
`;

// Crooked trees scattered over the landscape, built from points: a leaning
// trunk, 3-5 drooping branches, 2-3 twigs per branch, and loose leaf
// clumps at the twig tips. Like the crags they ride along with the terrain.
const treeVertexShader =
  common +
  /* glsl */ `
  // x: spot in the looping band (picks the tree's row), y: column,
  // z: which part (trunk / branch / twig / leaves), w: distance along it
  attribute vec4 aSeed;
  // x: which branch, y: which twig, z: angle around the limb, w: leaf scatter
  attribute vec4 aSeed2;

  const float BAND_END = 14.0;
  const float BAND_LENGTH = 32.0;
  const float TREE_CELL = 4.0;  // one tree per 4 x 4 patch of ground...
  const float TREE_COLS = 5.0;  // ...in 5 columns across x from -10 to 10
  const float X_START = -10.0;

  void main() {
    float travel = uTime * TRAVEL;
    float bandZ = BAND_END - BAND_LENGTH + mod(aSeed.x * BAND_LENGTH + travel, BAND_LENGTH);
    float row = floor((bandZ - travel) / TREE_CELL);
    float col = floor(aSeed.y * TREE_COLS);
    vec2 h1 = hash01(vec2(col, row) + 41.0);
    vec2 h2 = hash01(vec2(col, row) + 87.0);

    // Root, jittered inside its patch (terrain space)
    vec2 spot = vec2(X_START + (col + 0.15 + h1.x * 0.7) * TREE_CELL, (row + 0.15 + h1.y * 0.7) * TREE_CELL);

    // Only grow on the rim, back from the canyon's edge (so branches never
    // reach the camera's flight path), and not inside a rock crag or crowding
    // one of the big lone trees
    float d = canyonDistance(spot);
    float hw = canyonHalfWidth(spot.y);
    float visible = d > hw + 0.9 ? 1.0 : 0.0;
    Crag c = nearestCrag(spot.y);
    vec2 cv = spot - c.center;
    float keepClear = c.tree > 0.5 ? 2.2 : cragOutline(c, atan(cv.y, cv.x), 0.0) + 0.4;
    if (length(cv) < keepClear) visible = 0.0;
    vec3 root = vec3(spot.x, baseHeight(spot) - 0.05, spot.y);

    vec3 n;
    vec3 p = treePoint(root, col * 13.0 + row * 7.0, 0.6 + h2.x * 0.9, 0.0, aSeed.z, aSeed.w, aSeed2, n);

    vLight = lightAmount(n);
    vHeight = p.y;
    vStrata = 0.0;
    vRand = fract(aSeed2.z * 37.1 + aSeed.w * 11.3);
    vShade = 0.9;
    vVisible = visible;
    emit(vec3(p.x, p.y, p.z + travel));
  }
`;

const fragmentShader = /* glsl */ `
  varying float vLight;
  varying float vHeight;
  varying float vStrata;
  varying float vDepth;
  varying float vRand;
  varying float vShade;
  varying float vVisible;

  void main() {
    if (vVisible < 0.5) discard;
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float radialAlpha = smoothstep(0.5, 0.15, dist);

    // Palette sampled from the reference scan
    vec3 shadow = vec3(0.05, 0.17, 0.29);  // deep navy (still visible in shade)
    vec3 mid    = vec3(0.08, 0.42, 0.48);  // teal
    vec3 lit    = vec3(0.30, 1.00, 0.52);  // bright scan green

    float l = vLight;
    vec3 color = mix(shadow, mid, smoothstep(0.0, 0.45, l));
    color = mix(color, lit, smoothstep(0.45, 0.9, l));

    // Rock strata streaks, per-point speckle, and darkening for fissures,
    // caves and the patch edges
    color *= 0.82 + 0.18 * vStrata;
    color *= 0.75 + 0.5 * vRand;
    color *= vShade;

    // Low ground sinks into darkness, high ground holds its colour
    color *= mix(0.62, 1.0, smoothstep(0.0, 2.5, vHeight));

    // Distance fog so the far terrain dissolves into black
    float fogAlpha = smoothstep(24.0, 5.0, vDepth);

    gl_FragColor = vec4(color, radialAlpha * fogAlpha * 0.9);
  }
`;

// Point budget: 400,000 in total (phones start with a fraction - see CanyonScan)
const TERRAIN_POINTS = 165000;
const CRAG_POINTS = 110000;
const WALL_POINTS = 70000;
const TREE_POINTS = 55000;
// Ground points are stored as this many layers, each spread over the whole
// landscape, so drawing fewer layers thins the ground out evenly
const TERRAIN_LEVELS = 20;

// ---- automatic slowdown ----------------------------------------------------
// While the frame rate stays below SLOW_FPS, draw fewer points, one step at a
// time. If even the last step runs below FREEZE_FPS, hold a still frame.
const SLOW_FPS = 45;
const FREEZE_FPS = 20;
const QUALITY_STEPS = [1, 0.8, 0.65, 0.5, 0.4, 0.3];

// Terrain patch: wide across, and long down the canyon in front of the camera
const X_MIN = -10;
const X_MAX = 10;
const Z_MIN = -18;
const Z_MAX = 6;

// ---- camera flight ---------------------------------------------------------
const CAMERA_Z = 5;
const LOOK_AHEAD = 7; // how far down the canyon the camera aims
const CRUISE_HEIGHT = 4.9; // above the rim (rim ~2.5-4.5, crag tops ~4.3-5.4)
const CANYON_HEIGHT = 1.25; // down between the walls, clear of the boulders
// How close the camera may drift toward either canyon wall
const WALL_CLEARANCE = 0.6;
// Overall pace of the flight: 1 = full speed, lower = slower everything
// (forward travel, drifting, banking and the dives into the canyon)
const FLIGHT_PACE = 0.4;
// One cruise -> dive into the canyon -> climb out cycle, in flight time
// (real seconds = DIVE_PERIOD / FLIGHT_PACE, so about 2.3 minutes)
const DIVE_PERIOD = 56;
// Kept outside the component so re-renders don't hand the canvas new objects
const CAMERA = {
  position: [0, CRUISE_HEIGHT, CAMERA_Z],
  fov: 58,
  near: 0.05,
  far: 60,
};
const DPR = [1, 2];

// Mirrors canyonCenter() in the shader
const canyonCenter = (z) => Math.sin(z * 0.18) + Math.sin(z * 0.07 + 1.3) * 0.6;
// Its second derivative: how sharply the canyon is bending (for banking)
const canyonBend = (z) =>
  -0.0324 * Math.sin(z * 0.18) - 0.00294 * Math.sin(z * 0.07 + 1.3);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const randoms = (n) => Float32Array.from({ length: n }, () => Math.random());

// ---- canyon walls, for steering the camera ---------------------------------
// The same noise the shader uses (hash2, gnoise, canyonHalfWidth and
// canyonDistance), so the camera can see where the walls actually are -
// they wander well off the centreline - and fly down the middle of the gap.
const fract = (x) => x - Math.floor(x);
const hash2 = (px, py) => {
  let x = fract(px * 0.1031);
  let y = fract(py * 0.103);
  let z = fract(px * 0.0973);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return [fract((x + y) * z) * 2 - 1, fract((x + z) * y) * 2 - 1];
};
const gnoise = (px, py) => {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const corner = (cx, cy) => {
    const [gx, gy] = hash2(ix + cx, iy + cy);
    return gx * (fx - cx) + gy * (fy - cy);
  };
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(corner(0, 0), corner(1, 0), ux), lerp(corner(0, 1), corner(1, 1), ux), uy);
};
const canyonHalfWidth = (z) => 1.6 + gnoise(z * 0.15, 3.7) * 0.6;
const canyonDistance = (x, z) =>
  Math.abs(x - canyonCenter(z)) + gnoise(x * 0.9, z * 0.9) * 0.6 + gnoise(x * 2.3, z * 2.3) * 0.25;

// The open gap between the walls at a point along the canyon: its middle
// and half its width. A wall starts where its steep band begins, a little
// in front of the rock face itself.
const canyonGap = (z) => {
  const center = canyonCenter(z);
  const halfWidth = canyonHalfWidth(z);
  const wallAt = (side) => {
    let open = 0;
    for (let s = 0.05; s <= 3.5; s += 0.05) {
      if (canyonDistance(center + side * s, z) >= halfWidth) {
        // narrow it down between the last open step and this one
        let hit = s;
        for (let i = 0; i < 6; i++) {
          const mid = (open + hit) / 2;
          if (canyonDistance(center + side * mid, z) >= halfWidth) hit = mid;
          else open = mid;
        }
        return open;
      }
      open = s;
    }
    return 3.5;
  };
  const left = wallAt(-1);
  const right = wallAt(1);
  return { mid: center + (right - left) / 2, half: (left + right) / 2 };
};

function ScanPoints({ pointsRef, vertexShader, attributes, uniforms }) {
  // depthWrite lets nearer rock hide what's behind it, so surfaces read as
  // solid. frustumCulled is off because the shaders move every point away
  // from where three.js thinks it is.
  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        {Object.entries(attributes).map(([name, [array, size]]) => (
          <bufferAttribute
            key={name}
            attach={`attributes-${name}`}
            args={[array, size]}
          />
        ))}
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
      />
    </points>
  );
}

function CanyonScan({ onTooSlow }) {
  const terrainRef = useRef();
  const cragRef = useRef();
  const wallRef = useRef();
  const treeRef = useRef();
  // Frame-rate watcher state (see the end of useFrame)
  const perf = useRef({
    step: 0,
    frames: 0,
    time: 0,
    slow: 0,
    settle: 3,
    lastFps: 0,
    locked: false,
  });
  // Camera's eased sideways position and aim (see useFrame)
  const flight = useRef({ x: null, aimX: null, t: 0 });

  const { terrain, crags, walls, trees, counts, uniforms } = useMemo(() => {
    // Phones start with fewer points: these shaders are heavy and run every frame
    const density = window.innerWidth < 768 ? 0.45 : 1;
    const count = (n) => Math.round(n * density);
    const perLevel = Math.round(count(TERRAIN_POINTS) / TERRAIN_LEVELS);
    const terrainCount = perLevel * TERRAIN_LEVELS;
    const cragCount = count(CRAG_POINTS);
    const wallCount = count(WALL_POINTS);
    const treeCount = count(TREE_POINTS);

    // Randomly scattered ground points (no grid) so it reads as scan data,
    // with extra packed around the canyon where the camera looks closest.
    // Depth: denser close to the camera, where gaps between points show
    // most, and thinner far off where the fog swallows them anyway.
    const randomX = () =>
      Math.random() < 0.3
        ? -4.5 + Math.random() * 9
        : X_MIN + Math.random() * (X_MAX - X_MIN);
    const nearBiasedZ = (power) =>
      Z_MAX - (Z_MAX - Z_MIN) * Math.random() ** power;
    // Stored as layers that each cover the whole landscape, so the slowdown
    // can drop whole layers. Within a layer, points are sorted by x so
    // neighbours in the buffer are near each other, which lets the GPU skip
    // the canyon-floor maths for whole batches of rim points.
    const terrainPositions = new Float32Array(terrainCount * 3);
    for (let level = 0, i = 0; level < TERRAIN_LEVELS; level++) {
      const xs = Float32Array.from({ length: perLevel }, randomX).sort();
      for (let k = 0; k < perLevel; k++, i++) {
        terrainPositions[i * 3] = xs[k];
        terrainPositions[i * 3 + 2] = nearBiasedZ(1.35);
      }
    }

    // Wall points only need a world z; the shader finds the wall at that depth
    const wallPositions = new Float32Array(wallCount * 3);
    for (let i = 0; i < wallCount; i++) {
      wallPositions[i * 3 + 2] = nearBiasedZ(1.6);
    }

    // Crag and tree points are placed entirely in the shader from their
    // seeds; the empty position buffers only tell three.js how many to draw.
    return {
      terrain: {
        position: [terrainPositions, 3],
        aRand: [randoms(terrainCount), 1],
      },
      crags: {
        position: [new Float32Array(cragCount * 3), 3],
        aSeed: [randoms(cragCount * 4), 4],
      },
      walls: {
        position: [wallPositions, 3],
        aSeed: [randoms(wallCount * 4), 4],
      },
      trees: {
        position: [new Float32Array(treeCount * 3), 3],
        aSeed: [randoms(treeCount * 4), 4],
        aSeed2: [randoms(treeCount * 4), 4],
      },
      counts: { perLevel, crag: cragCount, wall: wallCount, tree: treeCount },
      uniforms: { uTime: { value: 0 } },
    };
  }, []);

  // Draw only the first part of each point set. Every set is spread evenly
  // through its buffer, so a shorter draw just thins everything out.
  const applyQuality = (q) => {
    terrainRef.current?.geometry.setDrawRange(
      0,
      Math.round(q * TERRAIN_LEVELS) * counts.perLevel,
    );
    cragRef.current?.geometry.setDrawRange(0, Math.round(q * counts.crag));
    wallRef.current?.geometry.setDrawRange(0, Math.round(q * counts.wall));
    treeRef.current?.geometry.setDrawRange(0, Math.round(q * counts.tree));
  };

  // Coming back to the tab produces one huge frame gap; don't count it as slow
  useEffect(() => {
    const onVisibility = () =>
      Object.assign(perf.current, { settle: 1, frames: 0, time: 0, slow: 0 });
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useFrame(({ clock, camera }, delta) => {
    const t = clock.getElapsedTime() * FLIGHT_PACE; // flight time
    uniforms.uTime.value = t;
    const travel = t * TRAVEL;

    // 0 while cruising above the rim, 1 while flying down inside the canyon
    const cycle = 0.5 - 0.5 * Math.cos((t / DIVE_PERIOD) * Math.PI * 2);
    const dive = smoothstep(0.35, 0.85, cycle);

    // Fly down the middle of the gap between the canyon walls (not just the
    // centreline - the walls wander), drifting side to side only as far as
    // the gap allows, easing forward and back, and bobbing gently
    const z = CAMERA_Z + Math.sin(t * 0.11) * 0.6;
    const q = z - travel; // where along the canyon the camera currently is
    const gap = canyonGap(q);
    const room = Math.max(0, gap.half - WALL_CLEARANCE);
    const drift =
      (Math.sin(t * 0.23) * 0.25 + Math.sin(t * 0.37 + 1.7) * 0.1) *
      (1 - dive * 0.4);
    const targetX = gap.mid + Math.max(-room, Math.min(room, drift));
    const y =
      lerp(CRUISE_HEIGHT, CANYON_HEIGHT, dive) + Math.sin(t * 0.31) * 0.15;

    // Aim down the middle of the gap further ahead: tilted down over the
    // rim, nearly level inside
    const tz = z - LOOK_AHEAD;
    const aheadGap = canyonGap(tz - travel);
    const targetAimX = aheadGap.mid + Math.sin(t * 0.17) * Math.min(0.4, aheadGap.half * 0.5);

    // Ease toward those targets so any kink in the walls can't jerk the camera
    // (snap straight there on the first frame, or after a long gap)
    const f = flight.current;
    const dt = t - f.t;
    f.t = t;
    const ease = f.x === null || dt > 2 ? 1 : 1 - Math.exp(-Math.max(0, dt) / 0.6);
    f.x = f.x === null ? targetX : lerp(f.x, targetX, ease);
    f.aimX = f.aimX === null ? targetAimX : lerp(f.aimX, targetAimX, ease);

    camera.position.set(f.x, y, z);
    camera.lookAt(f.aimX, lerp(2.2, 0.9, dive) + Math.sin(t * 0.13) * 0.2, tz);

    // Bank into the bends, plus a slight lazy roll
    camera.rotateZ(-canyonBend(q - 3) * 2.5 + Math.sin(t * 0.19) * 0.02);

    // ---- automatic slowdown: measure the frame rate over 1-second windows
    const p = perf.current;
    if (p.settle > 0) {
      p.settle -= delta; // let start-up (and each change) settle before judging
      return;
    }
    p.frames += 1;
    p.time += delta;
    if (p.time < 1) return;
    const fps = p.frames / p.time;
    p.frames = 0;
    p.time = 0;
    p.slow = fps < SLOW_FPS ? p.slow + 1 : 0;
    if (p.slow < 2) return; // only act on two slow seconds in a row
    p.slow = 0;

    const lastStep = p.step === QUALITY_STEPS.length - 1;
    // Did the previous cut actually speed things up? If not, something else
    // is holding the frame rate down (e.g. a browser capped at 30fps), so
    // stop thinning the scene out for nothing.
    const helped = p.step === 0 || fps > p.lastFps * 1.08;
    if (fps < FREEZE_FPS && (lastStep || p.locked || !helped)) {
      onTooSlow(); // hopeless: hold a still frame
      return;
    }
    if (p.locked || lastStep) return;
    if (!helped) {
      p.locked = true;
      return;
    }
    p.step += 1;
    p.lastFps = fps;
    p.settle = 1.5;
    applyQuality(QUALITY_STEPS[p.step]);
  });

  return (
    <>
      <ScanPoints
        pointsRef={terrainRef}
        vertexShader={terrainVertexShader}
        attributes={terrain}
        uniforms={uniforms}
      />
      <ScanPoints
        pointsRef={wallRef}
        vertexShader={wallVertexShader}
        attributes={walls}
        uniforms={uniforms}
      />
      <ScanPoints
        pointsRef={cragRef}
        vertexShader={cragVertexShader}
        attributes={crags}
        uniforms={uniforms}
      />
      <ScanPoints
        pointsRef={treeRef}
        vertexShader={treeVertexShader}
        attributes={trees}
        uniforms={uniforms}
      />
    </>
  );
}

// If creating or running the 3D scene throws, drop it and leave the plain
// gradient behind it rather than taking the rest of the page down with it
class SceneErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MoonTripBackground() {
  // Reduced motion: draw a single still frame instead of animating
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Too slow even with the fewest points: hold a still frame
  const [frozen, setFrozen] = useState(false);
  // The browser shut the 3D context down (GPU trouble, too many tabs...):
  // remove the canvas and fall back to the plain gradient
  const [lost, setLost] = useState(false);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        background:
          "radial-gradient(circle at 50% 40%, #04090d 0%, #010203 100%)",
        pointerEvents: "none",
      }}
    >
      {!lost && (
        <SceneErrorBoundary>
          <Canvas
            camera={CAMERA}
            dpr={DPR}
            frameloop={reduceMotion || frozen ? "demand" : "always"}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                () => setLost(true),
                { once: true },
              );
            }}
          >
            <CanyonScan onTooSlow={() => setFrozen(true)} />
          </Canvas>
        </SceneErrorBoundary>
      )}
    </div>
  );
}
