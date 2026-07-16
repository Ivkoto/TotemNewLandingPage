/* <hero-particles logo-src="…" density="1"> — particle field that assembles the
   TOTEM logo, then morphs (scroll-driven) into a bandana ring-tube, then into a
   mountain ridge. Progress is read from the nearest [data-hero-track] ancestor. */
(function () {
  if (customElements.get('hero-particles')) return;

  const PALETTE = ['#45E0CF', '#45E0CF', '#45E0CF', '#FF6B47', '#9D7BFF'];

  class HeroParticles extends HTMLElement {
    static get observedAttributes() { return ['canvas-filter']; }

    attributeChangedCallback(name, oldV, newV) {
      if (name === 'canvas-filter' && this.canvas) this.canvas.style.filter = newV || 'none';
    }

    connectedCallback() {
      // The canvas is portaled to <body>: position:fixed inside the hero subtree can get
      // clipped/contained by the sticky overflow-hidden wrapper, which hides the swarm
      // once the user scrolls past the hero.
      this.style.cssText += 'display:block;position:absolute;inset:0;pointer-events:none;';
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;pointer-events:none;z-index:1;';
      document.body.appendChild(this.canvas);
      this.canvas.style.filter = this.getAttribute('canvas-filter') || 'none';
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.targets = { logo: [], ring: [], ridge: [] };
      this.progress = 0;
      this.t = 0;
      this.dead = false;
      this.reduced = this.getAttribute('reduced-motion') === 'true';

      this._resize = () => this.resize();
      window.addEventListener('resize', this._resize);
      this.resize();

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { this.logoImg = img; this.buildTargets(); this.spawn(); };
      img.src = this.getAttribute('logo-src') || '';

      const loop = () => {
        if (this.dead) return;
        this.step();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    disconnectedCallback() {
      this.dead = true;
      window.removeEventListener('resize', this._resize);
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth || 1, h = window.innerHeight || 1;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.W = w; this.H = h;
      if (this.logoImg) { this.buildTargets(); this.retarget(); }
    }

    count() {
      const d = parseFloat(this.getAttribute('density') || '1');
      const base = Math.round(Math.min(1800, Math.max(600, (this.W * this.H) / 900)));
      return Math.round(base * d);
    }

    buildTargets() {
      const N = this.count();
      const { W, H } = this;

      // --- LOGO: sample alpha of the logo image ---
      const iw = 320, ih = Math.round(320 * (this.logoImg.height / this.logoImg.width));
      const oc = document.createElement('canvas');
      oc.width = iw; oc.height = ih;
      const octx = oc.getContext('2d');
      octx.drawImage(this.logoImg, 0, 0, iw, ih);
      const data = octx.getImageData(0, 0, iw, ih).data;
      const pts = [];
      for (let y = 0; y < ih; y += 2) {
        for (let x = 0; x < iw; x += 2) {
          if (data[(y * iw + x) * 4 + 3] > 120) pts.push([x / iw, y / ih]);
        }
      }
      const logoW = Math.min(W * 0.72, 760);
      const logoH = logoW * (ih / iw);
      const lx = (W - logoW) / 2, ly = H * 0.42 - logoH / 2;
      const logo = [];
      for (let i = 0; i < N; i++) {
        const p = pts[Math.floor((i / N) * pts.length)] || [0.5, 0.5];
        logo.push([lx + p[0] * logoW, ly + p[1] * logoH]);
      }

      // --- RING: spinning bandana — one long cylinder whose front half tapers to a downward point ---
      const ring = [];
      const R = Math.min(W, H) * 0.21;
      const tube = R * 2.1;         // length of the cylinder
      const pointLen = R * 1.1;     // extra length of the tapering point
      const cx = W / 2, cy = H * 0.36;
      const frac = (v) => v - Math.floor(v);
      const front = Math.PI / 2;    // where the point sits
      for (let i = 0; i < N; i++) {
        const r1 = frac(i * 0.618033988);
        const r2 = frac(i * 0.754877666);
        const th = r1 * Math.PI * 2;
        // downward point on the front half: bottom edge extends by pointLen, peaking at the front
        const c = Math.cos(th - front);
        const ext = c > 0 ? pointLen * 1.265 * c * c : -tube * 0.22 * c * c;      // front point lower, back hem lifted
        const yTop = -tube / 2 + Math.sin(th * 4.3 + 0.8) * tube * 0.005;         // nearly flat top hem
        const yBottom = tube / 2 + ext + Math.sin(th * 5.1) * tube * 0.025;       // gently wavy bottom hem
        const Y = yTop + r2 * (yBottom - yTop);
        const yNorm = (Y + tube / 2) / (tube + pointLen);                         // 0 top -> 1 tip
        // cloth folds: several overlapping waves, deeper toward the hem, drifting with height
        const fold =
          0.045 * Math.sin(th * 3.7 + Y * 0.012) +
          0.03 * Math.sin(th * 6.3 + 1.7 - Y * 0.02) +
          0.02 * Math.sin(th * 2.1 + 0.6);
        const rr = R * (1 + fold * (0.35 + 0.75 * yNorm));
        const X = rr * Math.cos(th) + (frac(i * 0.421) - 0.5) * 3;
        const Z = rr * Math.sin(th) + (frac(i * 0.317) - 0.5) * 3;
        const tilt = 0.22 * Math.min(1, yNorm * 2.2);                             // no tilt at the top hem, full tilt lower down
        const y2 = Y * 0.88 - Z * tilt + Math.sin(th * 8 + Y * 0.03) * (0.3 + 0.7 * yNorm); // flat top, ripple grows downward
        ring.push([cx + X, cy + y2, Z]);              // keep Z for depth/spin
      }

      // --- RIDGE: two layered mountain lines ---
      const ridge = [];
      const seed = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
      const ridgeY = (u, layer) => {
        let y = 0;
        y += Math.sin(u * 5.2 + layer * 9) * 0.35;
        y += Math.sin(u * 11.7 + layer * 3) * 0.22;
        y += Math.sin(u * 23.0 + layer * 7) * 0.1;
        return y;
      };
      for (let i = 0; i < N; i++) {
        const layer = i % 2;
        const u = seed(i * 1.7 + layer);
        const x = u * W;
        const base = layer === 0 ? H * 0.62 : H * 0.74;
        const amp = layer === 0 ? H * 0.14 : H * 0.1;
        const top = base - Math.abs(ridgeY(u * 6.28, layer)) * amp;
        const below = seed(i * 3.1) * seed(i * 5.3);      // cluster near the crest
        ridge.push([x, top + below * (H * 0.16), layer]);
      }

      this.targets = { logo, ring, ridge };
    }

    spawn() {
      const N = this.targets.logo.length;
      this.particles = [];
      for (let i = 0; i < N; i++) {
        this.particles.push({
          x: Math.random() * this.W,
          y: Math.random() * this.H,
          c: PALETTE[i % PALETTE.length],
          s: 0.8 + Math.random() * 1.6,
          j: Math.random() * Math.PI * 2,
        });
      }
    }

    retarget() {
      if (this.particles.length !== this.targets.logo.length) this.spawn();
    }

    readProgress() {
      let el = this.parentElement;
      while (el && !el.hasAttribute('data-hero-track')) el = el.parentElement;
      this.beyond = 0;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = r.height - vh;
      if (total <= 0) return 0;
      this.beyond = Math.max(0, -r.top - total);   // px scrolled past the hero track
      return Math.min(1, Math.max(0, -r.top / total));
    }

    step() {
      const { ctx, W, H } = this;
      this.t += 0.016;
      const p = this.reduced ? 0 : this.readProgress();
      this.progress = this.progress + (p - this.progress) * 0.12;

      ctx.clearRect(0, 0, W, H);
      if (!this.particles.length) return;
      ctx.globalCompositeOperation = 'lighter';

      const P = this.progress;
      // segment weights: logo [0–.3], ring [.3–.62], ridge [.62–1], then swarm past the hero
      const m1 = smooth((P - 0.22) / 0.26);   // logo->ring
      const m2 = smooth((P - 0.58) / 0.28);   // ring->ridge
      const vh = window.innerHeight || 1;
      const m3t = this.reduced ? 0 : smooth(this.beyond / (vh * 0.6)); // ridge->swarm
      this.m3 = (this.m3 || 0) + (m3t - (this.m3 || 0)) * 0.1;
      const m3 = this.m3;
      const spin = this.t * 0.35;
      const { logo, ring, ridge } = this.targets;
      const cx = W / 2;
      // snake-swarm spine parameters — driven purely by scroll so it moves in sync with the user
      const sc = (window.scrollY || 0) * 0.004;
      const tt = this.t * 0.45;

      for (let i = 0; i < this.particles.length; i++) {
        const pt = this.particles[i];
        const L = logo[i];
        // spin the ring slowly
        const rg = ring[i];
        const rx = cx + (rg[0] - cx) * Math.cos(spin) - rg[2] * Math.sin(spin) * 0.9;
        const rz = (rg[0] - cx) * Math.sin(spin) + rg[2] * Math.cos(spin);
        const ry = rg[1] + rz * 0.06;
        const rd = ridge[i];

        let tx = L[0] + (rx - L[0]) * m1;
        let ty = L[1] + (ry - L[1]) * m1;
        tx = tx + (rd[0] - tx) * m2;
        ty = ty + (rd[1] - ty) * m2;

        // swarm mode: a scroll-locked snake in the top half of the viewport, behind the sections
        if (m3 > 0.001) {
          const u = (i / this.particles.length);                     // position along the snake
          const rA = ((i * 0.7548776662) % 1) * Math.PI * 2 + tt * 0.3;
          const bend1 = Math.sin(u * 3.0 + sc + tt * 0.35);
          const bend2 = Math.sin(u * 6.3 - sc * 0.6 + tt * 0.22 + 1.4);
          const sx = W * (0.5 + 0.33 * bend1 + 0.10 * bend2);        // slithering spine
          const syv = H * (0.08 + 0.45 * u) + Math.sin(u * 4 + tt * 0.8) * H * 0.02;  // pinned to the top 8–53%
          const gather = Math.pow(Math.sin(sc * 0.9 + u * 1.5 + tt * 0.25) * 0.5 + 0.5, 1.4); // converge/spread
          const thick = 55 + 130 * gather;
          const wob = ((i * 0.421) % 1);
          const scat = ((i * 0.937) % 1);                            // extra per-particle scatter
          const swx = sx + Math.cos(rA) * thick * (0.15 + 1.25 * wob) + (scat - 0.5) * 70;
          const swy = syv + Math.sin(rA) * thick * 0.85 * (0.15 + 1.25 * wob) + (((i * 0.653) % 1) - 0.5) * 60;
          tx = tx + (swx - tx) * m3;
          ty = ty + (swy - ty) * m3;
        }

        // idle shimmer
        const jig = this.reduced ? 0 : Math.sin(this.t * 1.4 + pt.j) * 1.2;
        const k = 0.085 + (this.m3 || 0) * 0.1;      // follow scroll more tightly in swarm mode

        pt.x += (tx - pt.x) * k;
        pt.y += (ty + jig - pt.y) * k;

        let a = 0.85;
        if (m1 > 0.05 && m2 < 0.5) a = 0.5 + 0.5 * ((rz / (Math.min(W, H) * 0.28)) * 0.5 + 0.5); // depth on ring
        if (m2 > 0.5) a = rd[2] === 0 ? 0.9 : 0.45;
        if (m3 > 0.05) {
          // behind the glass sections — keep them readable but clearly present
          const deep = ((i * 0.317) % 1) < 0.35;
          a = a + ((deep ? 0.3 : 0.75) - a) * m3;
        }

        ctx.globalAlpha = Math.max(0.12, Math.min(1, a));
        ctx.fillStyle = pt.c;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.s, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function smooth(v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); }

  customElements.define('hero-particles', HeroParticles);
})();
