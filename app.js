/*
 * 자기장 속 전류가 받는 힘 — 시뮬레이션 실험
 *
 * 방향(정면에서 본 기준)
 *   x : 오른쪽(+) / 왼쪽(−)
 *   y : 위쪽(+)   / 아래쪽(−)
 *   z : 화면 밖(+) / 화면 안(−)
 *
 * 물리 법칙:  F = I L × B
 *   힘의 방향 = (전류의 방향) × (자기장의 방향)   ← 벡터곱으로 직접 계산
 *   힘의 크기 ∝ 전류의 세기 (자기장의 세기와 도선의 길이는 일정)
 *
 * 그림은 비스듬히 내려다본 모습(사투상)으로 그립니다.
 *   화면 안쪽(−z)은 그림에서 오른쪽 위로, 화면 밖(+z)은 왼쪽 아래로 보입니다.
 */
(() => {
  'use strict';

  /* ================= 기본 ================= */
  const COL = { I: '#FF1744', B: '#00C853', F: '#2962FF' };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';

  const state = {
    cdir: -1,          // -1: 앞(+)→뒤(−) 화면 안으로,  +1: 뒤(+)→앞(−) 화면 밖으로
    I: 3,              // 전류의 세기 0~5
    npos: 'right',     // N극 위치
    hand: false,       // 오른손 겹쳐 보기
    show: { I: true, B: true, F: true },
  };

  // 3차원 벡터
  const V = (x, y, z) => [x, y, z];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function physics() {
    const I = V(0, 0, state.cdir);                               // 전류
    const B = state.npos === 'right' ? V(-1, 0, 0) : V(1, 0, 0); // 자기장 N → S
    const F = cross(I, B);                                       // 힘 = 전류 × 자기장
    return { I, B, F, mag: state.I };
  }
  function dirWord(v) {
    if (v[0] > 0.5) return '오른쪽 →';
    if (v[0] < -0.5) return '왼쪽 ←';
    if (v[1] > 0.5) return '위쪽 ↑';
    if (v[1] < -0.5) return '아래쪽 ↓';
    if (v[2] > 0.5) return '화면 밖으로 ⊙';
    return '화면 안으로 ⊗';
  }

  /* ================= 투영 (3차원 → 그림 좌표) ================= */
  const DEPTH = [180, -120];                                   // 자석 그림에서 '안쪽으로 한 칸'
  const DU = (() => { const l = Math.hypot(...DEPTH); return [DEPTH[0] / l, DEPTH[1] / l]; })();
  const KZ = 0.62;                                             // 깊이 방향 줄임 비율
  const EZ = [-DU[0] * KZ, -DU[1] * KZ];                       // 화면 밖(+z) 1 → 그림에서 이동
  const proj = (v) => [v[0] + v[2] * EZ[0], -v[1] + v[2] * EZ[1]];
  // 손은 손바닥이 잘 보이도록 조금 더 위에서 내려다본 모습으로 그림 (화면 안쪽 = 오른쪽 위)
  const EZH = [-0.5, 0.62];
  const projH = (v) => [v[0] + v[2] * EZH[0], -v[1] + v[2] * EZH[1]];
  const VIEWDIR = norm([-EZH[0], EZH[1], 1]);                  // 보는 사람 쪽 방향 (projH(VIEWDIR) = 0)

  /* ================= 이미지 ================= */
  const IMG = {};
  function loadImages() {
    const files = {
      magSN: 'images/magnet_sn.png',
      magNS: 'images/magnet_ns.png',
      handPalm: 'images/hand_palm.png',
      handBack: 'images/hand_back.png',
    };
    return Promise.all(Object.entries(files).map(([k, src]) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { IMG[k] = im; res(); };
      im.onerror = () => { console.error('이미지를 불러오지 못했습니다:', src); res(); };
      im.src = src;
    })));
  }

  /* ================= 캔버스 ================= */
  const canvas = document.getElementById('sim');
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, DPR = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ================= 그리기 도구 ================= */
  function arrow2D(x, y, dx, dy, len, color, w) {
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const hl = Math.min(w * 3.6, len * 0.5), hw = w * 3.2;
    const ex = x + dx * (len - hl), ey = y + dy * (len - hl);
    const tx = x + dx * len, ty = y + dy * len;
    const px = -dy, py = dx;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + px * w / 2, y + py * w / 2);
    ctx.lineTo(ex + px * w / 2, ey + py * w / 2);
    ctx.lineTo(ex + px * hw / 2, ey + py * hw / 2);
    ctx.lineTo(tx, ty);
    ctx.lineTo(ex - px * hw / 2, ey - py * hw / 2);
    ctx.lineTo(ex - px * w / 2, ey - py * w / 2);
    ctx.lineTo(x - px * w / 2, y - py * w / 2);
    ctx.closePath();
    ctx.lineWidth = w * 0.7;
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = w;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    return [tx, ty];
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 화면 좌표(CSS px)의 이름표
  function tag(x, y, text, bg, size = 16) {
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = `800 ${size}px ${FONT}`;
    const w = ctx.measureText(text).width + 22, h = size + 14;
    x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));
    y = Math.max(h / 2 + 4, Math.min(H - h / 2 - 4, y));
    ctx.shadowColor = 'rgba(0,0,0,.2)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  /* ================= 장면 배치 (단위: 자석 그림 픽셀) ================= */
  const MAG = { w: 1032, h: 988, split: 500 };
  const GAP = { leftFace: 175, rightFace: 670 };               // 자석 앞면에서 두 극 사이 틈의 왼쪽·오른쪽 끝
  const ROD0 = [422, 420];                                     // 자석 앞면에서 도선이 지나는 점
  const ROD_T = [-2.5, 3.7];                                   // 도선 앞 끝, 뒤 끝 (자석 두께 단위)
  const LETTER = { left: [265, 215], right: [925, 225] };
  const VIEW = { x0: -120, x1: 1160, y0: -120, y1: 1000 };

  let rodDisp = 0, rodVel = 0, flow = 0;
  const rodPoint = (t) => [ROD0[0] + DEPTH[0] * t, ROD0[1] + DEPTH[1] * t + rodDisp];

  function drawRod(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L, r = 11;
    const g = ctx.createLinearGradient(a[0] + nx * r, a[1] + ny * r, a[0] - nx * r, a[1] - ny * r);
    g.addColorStop(0, '#9C4A12');
    g.addColorStop(0.35, '#F7A35C');
    g.addColorStop(0.55, '#FFD2A6');
    g.addColorStop(1, '#B85A1C');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineWidth = r * 2 + 4; ctx.strokeStyle = '#7A3A10'; ctx.stroke();
    ctx.lineWidth = r * 2; ctx.strokeStyle = g; ctx.stroke();
    ctx.restore();
  }

  function drawRodCharges(a, b) {
    if (state.I === 0) return;
    // 전류는 (+) 끝에서 (−) 끝으로
    const into = state.cdir < 0;
    const s = into ? a : b, e = into ? b : a;
    const L = Math.hypot(e[0] - s[0], e[1] - s[1]);
    const gap = 62;
    for (let d = ((flow % gap) + gap) % gap; d < L; d += gap) {
      const t = d / L;
      ctx.beginPath();
      ctx.arc(s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFE600';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#8A6D00';
      ctx.stroke();
    }
  }

  function drawLetter(p, text) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.transform(1, DEPTH[1] / DEPTH[0], 0, 1, 0, 0);
    ctx.font = `900 118px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // 극 사이의 자기장: 여러 개의 곧은 화살표 (N극 → S극)
  function drawField(depths) {
    const toRight = state.npos === 'left';
    for (const t of depths) {
      for (const hy of [300, 420, 525]) {
        const xl = GAP.leftFace + DEPTH[0] * t + 14;
        const xr = Math.min(GAP.rightFace + DEPTH[0] * t, GAP.rightFace) - 14;
        const y = hy + DEPTH[1] * t;
        if (toRight) arrow2D(xl, y, 1, 0, xr - xl, COL.B, 7);
        else arrow2D(xr, y, -1, 0, xr - xl, COL.B, 7);
      }
    }
  }

  /* ================= 오른손 (3차원으로 만들어 그림) =================
   * 손의 방향:  f = 네 손가락,  t = 엄지,  n = 손바닥이 향하는 쪽
   * 오른손은 n = t × f  이므로  (t, f, n) = (전류, 자기장, 힘)이면  힘 = 전류 × 자기장
   */
  const U = 235;                       // 손 크기 (그림 픽셀)
  const SKIN = {
    palm: ['#FFE6D2', '#FBCDAA', '#EDAE86'],
    back: ['#F9D3B4', '#EFB991', '#D99A70'],
    line: '#9A5A34',
  };
  const FINGERS = [   // [엄지 쪽 위치, 길이, 굵기]
    [0.355, 0.88, 0.122],
    [0.118, 0.98, 0.128],
    [-0.118, 0.92, 0.122],
    [-0.35, 0.74, 0.106],
  ];

  let handQ = null;                    // 애니메이션용 회전(사원수)

  function drawHandModel(O, f, t, n) {
    const palmFront = dot(n, VIEWDIR) > 0;                // 손바닥이 보이는가
    const tone = palmFront ? SKIN.palm : SKIN.back;
    const W3 = (lf, lt, ln) => add(add(mul(f, (lf - 0.5) * U), mul(t, lt * U)), mul(n, ln * U));
    const P = (lf, lt, ln) => { const p = projH(W3(lf, lt, ln)); return [O[0] + p[0], O[1] + p[1]]; };
    const depth = (lf, lt, ln) => dot(W3(lf, lt, ln), VIEWDIR);

    // 첨부된 오른손 그림을 바탕으로 만든 자연스러운 손 이미지를 사용한다.
    // 원본 이미지의 네 손가락 방향은 왼쪽, 엄지는 위쪽이므로
    // 이미지 x축을 -f, y축을 -t에 대응시키면 어떤 설정에서도
    // 네 손가락=자기장, 엄지=전류, 손바닥=힘 관계를 유지할 수 있다.
    const handImg = palmFront ? IMG.handPalm : IMG.handBack;
    if (handImg) {
      const df = projH(f);
      const dt = projH(t);
      const imageScale = 0.39;
      // 각 투명 PNG에서 손바닥 중심에 해당하는 기준점(px).
      const pivot = palmFront ? [785, 468] : [790, 456];

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = 0.97;
      // source +x(손목 쪽) -> -f, source +y(아래쪽) -> -t
      ctx.transform(
        -df[0] * imageScale, -df[1] * imageScale,
        -dt[0] * imageScale, -dt[1] * imageScale,
        O[0], O[1]
      );
      ctx.drawImage(handImg, -pivot[0], -pivot[1]);
      ctx.restore();

      return { P, palmFront };
    }

    const OW = 2.4;

    const grad = (a, b, r, cols) => {
      // 굵기 방향으로 밝은 쪽(왼쪽 위) → 어두운 쪽
      let px = -(b[1] - a[1]), py = b[0] - a[0];
      const l = Math.hypot(px, py) || 1; px /= l; py /= l;
      if (px + py > 0) { px = -px; py = -py; }
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const g = ctx.createLinearGradient(m[0] + px * r, m[1] + py * r, m[0] - px * r, m[1] - py * r);
      g.addColorStop(0, cols[0]); g.addColorStop(0.45, cols[1]); g.addColorStop(1, cols[2]);
      return g;
    };
    // 두 원(a 반지름 ra, b 반지름 rb)을 감싸는 모양 = 끝이 둥글고 점점 가늘어지는 손가락
    const capsule = (a, b, ra, cols, rb = ra) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
      ctx.beginPath();
      if (d <= Math.abs(ra - rb) + 0.01) ctx.arc(a[0], a[1], Math.max(ra, rb), 0, Math.PI * 2);
      else {
        const th = Math.atan2(dy, dx), al = Math.acos((ra - rb) / d);
        ctx.arc(a[0], a[1], ra, th + al, th + 2 * Math.PI - al, false);
        ctx.arc(b[0], b[1], rb, th - al, th + al, false);
        ctx.closePath();
      }
      ctx.fillStyle = grad(a, b, Math.max(ra, rb), cols); ctx.fill();
      ctx.lineWidth = OW; ctx.strokeStyle = SKIN.line; ctx.stroke();
    };
    const slab = (pts, r, cols) => {
      ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.lineWidth = 2 * r + 2 * OW; ctx.strokeStyle = SKIN.line; ctx.stroke();
      const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
      const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys) - r, Math.max(...xs), Math.max(...ys) + r);
      g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[2]);
      ctx.lineWidth = 2 * r; ctx.strokeStyle = g; ctx.stroke();
      ctx.fillStyle = g; ctx.fill();
    };
    const line = (pts, w = 2.2, a = 0.55) => {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.lineWidth = w; ctx.strokeStyle = `rgba(154,90,52,${a})`; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    };
    const curve = (fn, steps = 14) => Array.from({ length: steps + 1 }, (_, i) => fn(i / steps));
    const ellipse = (c, ax1, ax2) => curve((s) => {
      const a = s * Math.PI * 2;
      return [c[0] + ax1[0] * Math.cos(a) + ax2[0] * Math.sin(a), c[1] + ax1[1] * Math.cos(a) + ax2[1] * Math.sin(a)];
    }, 20);
    const nail = (pts) => {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = '#FFEDE3'; ctx.fill();
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(154,90,52,.75)'; ctx.stroke();
    };

    const parts = [];
    // 손목
    parts.push({ d: -1e9, draw: () => capsule(P(0.12, 0.02, 0), P(-0.6, 0.02, 0), 0.32 * U, tone, 0.27 * U) });
    // 손바닥(손등)
    parts.push({
      d: depth(0.5, 0, 0),
      draw: () => {
        slab([P(0.02, -0.36, 0), P(0.5, -0.44, 0), P(0.93, -0.45, 0), P(0.93, 0.46, 0), P(0.5, 0.47, 0), P(0.02, 0.38, 0)], 0.12 * U, tone);
        const s = palmFront ? 0.13 : -0.13;
        if (palmFront) {
          // 손금
          line(curve((u) => P(0.84 - 0.06 * u, -0.46 + 0.72 * u + 0.0, s)));
          line(curve((u) => P(0.66 - 0.08 * u - 0.05 * Math.sin(Math.PI * u), -0.44 + 0.82 * u, s)));
          line(curve((u) => P(0.58 - 0.5 * u, 0.4 - 0.2 * Math.sin(Math.PI * u * 0.8) - 0.12 * u, s)));
        } else {
          // 손등의 힘줄 느낌
          for (const tp of [0.3, 0.1, -0.12, -0.32]) line(curve((u) => P(0.25 + 0.6 * u, tp * (0.7 + 0.3 * u), s)), 1.8, 0.25);
        }
      },
    });
    // 네 손가락
    FINGERS.forEach(([tp, len, r]) => {
      const a = [0.9, tp, 0], b = [0.9 + len, tp, 0];
      parts.push({
        d: depth(0.9 + len / 2, tp, 0),
        draw: () => {
          capsule(P(...a), P(...b), r * U, tone, r * 0.86 * U);
          const s = palmFront ? r * 0.92 : -r * 0.92;
          for (const fr of palmFront ? [0.38, 0.68] : [0.36, 0.66]) {
            const lf = 0.9 + len * fr;
            line([P(lf, tp - r * 0.7, s), P(lf + (palmFront ? 0 : 0.02), tp, s * 1.05), P(lf, tp + r * 0.7, s)], 2, palmFront ? 0.5 : 0.35);
          }
          if (!palmFront) {
            const c = P(0.9 + len - 0.1, tp, -r * 0.98);
            const e1 = projH(mul(f, 0.085 * U)), e2 = projH(mul(t, r * 0.62 * U));
            nail(ellipse(c, e1, e2));
          }
        },
      });
    });
    // 엄지
    const th = [[0.12, 0.26, 0.04], [0.36, 0.64, 0.06], [0.43, 1.12, 0.07]];
    parts.push({ d: depth(0.24, 0.45, 0.05), draw: () => capsule(P(...th[0]), P(...th[1]), 0.2 * U, tone, 0.155 * U) });
    parts.push({
      d: depth(0.4, 0.98, 0.08),
      draw: () => {
        capsule(P(...th[1]), P(...th[2]), 0.15 * U, tone, 0.125 * U);
        // 엄지손톱 (손등 쪽 + 손목 쪽을 향함)
        const m = norm(add(mul(n, -0.55), mul(f, -0.6)));
        if (dot(m, VIEWDIR) > 0.12) {
          const axis = norm(add(mul(f, th[2][0] - th[1][0]), mul(t, th[2][1] - th[1][1])));
          const c3 = add(add(W3(...th[2]), mul(axis, -0.09 * U)), mul(m, 0.1 * U));
          const c = projH(c3);
          const side = cross(m, axis);
          nail(ellipse([O[0] + c[0], O[1] + c[1]], projH(mul(axis, 0.085 * U)), projH(mul(side, 0.07 * U))));
        }
      },
    });

    parts.sort((a, b) => a.d - b.d);   // 먼 것부터
    ctx.save();
    for (const p of parts) p.draw();
    ctx.restore();

    return { P, palmFront };
  }

  // 회전 애니메이션용 사원수
  function matToQuat(c0, c1, c2) {
    const m00 = c0[0], m10 = c0[1], m20 = c0[2], m01 = c1[0], m11 = c1[1], m21 = c1[2], m02 = c2[0], m12 = c2[1], m22 = c2[2];
    const tr = m00 + m11 + m22;
    let w, x, y, z;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = 0.25 * s; z = (m12 + m21) / s; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = 0.25 * s; }
    return [w, x, y, z];
  }
  function slerp(a, b, k) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map((v) => -v); d = -d; }
    let o;
    if (d > 0.9995) o = a.map((v, i) => v + (b[i] - v) * k);
    else { const th = Math.acos(d), s = Math.sin(th); o = a.map((v, i) => v * Math.sin((1 - k) * th) / s + b[i] * Math.sin(k * th) / s); }
    const l = Math.hypot(...o);
    return o.map((v) => v / l);
  }
  function quatCols(q) {
    const [w, x, y, z] = q;
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y)],
      [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)],
      [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)],
    ];
  }
  // 열벡터: (엄지 t, 네 손가락 f, 손바닥 n) = (전류, 자기장, 힘)
  const handTarget = () => { const ph = physics(); return matToQuat(ph.I, ph.B, cross(ph.I, ph.B)); };

  /* ================= 장면 그리기 ================= */
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const vw = VIEW.x1 - VIEW.x0, vh = VIEW.y1 - VIEW.y0;
    const sc = Math.min(W / vw, H / vh) * 0.97;
    const ox = (W - vw * sc) / 2 - VIEW.x0 * sc, oy = (H - vh * sc) / 2 - VIEW.y0 * sc;
    const S = (p) => [ox + p[0] * sc, oy + p[1] * sc];
    ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * ox, DPR * oy);

    const ph = physics();
    const mag = state.npos === 'right' ? IMG.magSN : IMG.magNS;
    const front = rodPoint(ROD_T[0]), back = rodPoint(ROD_T[1]);

    // 1) 자석 왼쪽 팔
    if (mag) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, MAG.split + 1, MAG.h); ctx.clip();
      ctx.drawImage(mag, 0, 0); ctx.restore();
    }
    // 2) 도선 뒤쪽 자기장 화살표 → 도선 → 도선 앞쪽 자기장 화살표
    if (state.show.B) drawField([0.85]);
    drawRod(front, back);
    drawRodCharges(front, back);
    if (state.show.B) drawField([0.15]);
    // 3) 자석 오른쪽 팔 (도선 뒷부분을 가림)
    if (mag) {
      ctx.save(); ctx.beginPath(); ctx.rect(MAG.split - 1, 0, MAG.w - MAG.split + 1, MAG.h); ctx.clip();
      ctx.drawImage(mag, 0, 0); ctx.restore();
      const nLeft = state.npos === 'left';
      drawLetter(LETTER.left, nLeft ? 'N' : 'S');
      drawLetter(LETTER.right, nLeft ? 'S' : 'N');
    }

    const tags = [];
    const O = rodPoint(0.5);

    if (!state.hand) {
      // 4) 도선 가운데에서 전류·힘 화살표
      if (state.show.I && state.I > 0) {
        const s = state.cdir < 0 ? 1 : -1;
        const tip = arrow2D(O[0], O[1], DU[0] * s, DU[1] * s, 270, COL.I, 13);
        tags.push([tip, [DU[0] * s, DU[1] * s], '전류', COL.I]);
      }
      if (state.show.F && state.I > 0) {
        const tip = arrow2D(O[0], O[1], 0, -ph.F[1], 70 + 34 * ph.mag, COL.F, 13);
        tags.push([tip, [0, -ph.F[1]], '힘', COL.F]);
      }
      ctx.beginPath(); ctx.arc(O[0], O[1], 9, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#14213D'; ctx.stroke();
    } else {
      // 4') 오른손 겹쳐 보기
      const [cf, ct, cn] = (() => { const c = quatCols(handQ); return [c[1], c[0], c[2]]; })();
      const { P } = drawHandModel(O, cf, ct, cn);
      const tq = handTarget();
      const settled = Math.abs(tq[0] * handQ[0] + tq[1] * handQ[1] + tq[2] * handQ[2] + tq[3] * handQ[3]) > 0.995;
      if (settled) {
        const a2 = (from, dir3, len3, col, text) => {
          const st = P(...from);
          const d = projH(dir3);
          const tip = arrow2D(st[0], st[1], d[0], d[1], Math.hypot(...d) * len3, col, 11);
          tags.push([tip, d.map((v) => v / Math.hypot(...d)), text, col]);
        };
        if (state.show.B) a2([0.5, 0, 0.16 * Math.sign(dot(cn, VIEWDIR) || 1)], cf, 1.85 * U, COL.B, '자기장');
        if (state.show.I && state.I > 0) a2([0.3, 0.5, 0.1], ct, 1.35 * U, COL.I, '전류');
        if (state.show.F && state.I > 0) a2([0.55, -0.05, 0.14], cn, 1.25 * U, COL.F, '힘');
      }
    }

    // 5) 도선 끝의 (+), (−)
    const plusEnd = state.cdir < 0 ? front : back, minusEnd = state.cdir < 0 ? back : front;
    for (const [p, txt, col] of [[plusEnd, '(+)', '#E53935'], [minusEnd, '(−)', '#263238']]) {
      const q = S(p);
      const out = p === front ? [-DU[0], -DU[1]] : [DU[0], DU[1]];
      tag(q[0] + out[0] * 26, q[1] + out[1] * 26, txt, col, 15);
    }
    // 6) 이름표
    if (state.show.B) {
      const q = S([GAP.leftFace + DEPTH[0] * 0.85 + 70, 300 + DEPTH[1] * 0.85 - 28]);
      tag(q[0], q[1], '자기장', COL.B, 15);
    }
    for (const [tip, d, text, col] of tags) {
      const q = S(tip);
      tag(q[0] + d[0] * 34, q[1] + d[1] * 30, text, col, 16);
    }
    const rl = S(rodPoint(-1.7));
    tag(rl[0] - 10, rl[1] + 30, '도선', '#B85A1C', 13);
  }

  /* ================= 시간에 따른 변화 ================= */
  function update(dt) {
    const ph = physics();
    const target = -ph.F[1] * 12 * ph.mag;               // 도선은 힘의 방향으로, 힘에 비례해 움직임
    rodVel += (target - rodDisp) * 70 * dt;
    rodVel *= Math.exp(-8 * dt);
    rodDisp += rodVel * dt;
    flow += dt * 45 * state.I;                           // 전류 흐름 표시
    const tq = handTarget();
    handQ = handQ ? slerp(handQ, tq, 1 - Math.exp(-dt * 5)) : tq;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ================= 글자 표시와 조작 ================= */
  const cells = document.getElementById('roCells');
  for (let i = 0; i < 5; i++) cells.appendChild(document.createElement('i'));

  function refreshUI() {
    const ph = physics();
    document.getElementById('roI').textContent = state.I === 0 ? '흐르지 않음' : dirWord(ph.I);
    document.getElementById('roB').textContent = dirWord(ph.B);
    document.getElementById('roF').textContent = state.I === 0 ? '없음' : dirWord(ph.F);
    [...cells.children].forEach((c, i) => c.classList.toggle('on', i < ph.mag));
    document.getElementById('valI').textContent = state.I;
    const slider = document.getElementById('slider');
    slider.value = state.I;
    slider.style.setProperty('--p', `${(state.I / 5) * 100}%`);
    document.querySelectorAll('#segDir button').forEach((b) => b.classList.toggle('on', +b.dataset.dir === state.cdir));
    document.querySelectorAll('#segB button').forEach((b) => b.classList.toggle('on', b.dataset.n === state.npos));
    document.querySelectorAll('[data-show]').forEach((b) => b.classList.toggle('on', state.show[b.dataset.show]));
    const hb = document.getElementById('handBtn');
    hb.classList.toggle('on', state.hand);
    hb.setAttribute('aria-pressed', state.hand);
    document.getElementById('handBtnSub').textContent = state.hand ? '다시 누르면 손이 사라져요' : '눌러서 손을 실험 장면 위에 올려요';
    let note = '';
    if (state.I === 0) note = '전류가 0이면 힘이 작용하지 않아요';
    else if (state.hand) note = ph.F[1] < 0 ? '손등이 보여요 · 손바닥은 아래쪽(힘의 방향)을 향해요' : '손바닥이 위쪽(힘의 방향)을 향해요';
    document.getElementById('stageNote').textContent = note;
  }

  document.querySelectorAll('#segDir button').forEach((b) =>
    b.addEventListener('click', () => { state.cdir = +b.dataset.dir; refreshUI(); }));
  document.querySelectorAll('#segB button').forEach((b) =>
    b.addEventListener('click', () => { state.npos = b.dataset.n; refreshUI(); }));
  document.querySelectorAll('[data-show]').forEach((b) =>
    b.addEventListener('click', () => { state.show[b.dataset.show] = !state.show[b.dataset.show]; refreshUI(); }));
  document.getElementById('slider').addEventListener('input', (e) => { state.I = +e.target.value; refreshUI(); });
  document.getElementById('minus').addEventListener('click', () => { state.I = Math.max(0, state.I - 1); refreshUI(); });
  document.getElementById('plus').addEventListener('click', () => { state.I = Math.min(5, state.I + 1); refreshUI(); });
  document.getElementById('handBtn').addEventListener('click', () => { state.hand = !state.hand; refreshUI(); });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  refreshUI();
  loadImages().then(() => requestAnimationFrame(frame));
})();
