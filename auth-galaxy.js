(() => {
  const canvas = document.getElementById('auth-galaxy-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = ['#20e7ff', '#6f7dff', '#b85cff', '#ff3fd8', '#ffd166'];
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    comets: [],
    mouseX: 0,
    mouseY: 0,
    lastTime: 0,
  };

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    createParticles();
  }

  function createParticles() {
    const area = state.width * state.height;
    const count = reduceMotion ? 260 : Math.min(1250, Math.max(560, Math.floor(area / 1350)));
    state.particles = Array.from({ length: count }, (_, index) => {
      const lane = Math.random();
      const radius = Math.pow(Math.random(), 0.52) * 1.02;
      return {
        lane,
        radius,
        angle: random(0, Math.PI * 2),
        speed: random(0.16, 0.52) * (1.35 - radius * 0.42),
        size: random(0.75, 2.35) * (1.15 - radius * 0.22),
        phase: random(0, Math.PI * 2),
        color: palette[index % palette.length],
        alpha: random(0.36, 0.95),
      };
    });
  }

  function getGalaxyFrame(time) {
    const mobile = state.width < 760;
    const centerX = state.width * (mobile ? 0.58 : 0.78) + state.mouseX * 18;
    const centerY = state.height * (mobile ? 0.38 : 0.52) + state.mouseY * 12;
    const maxRadius = Math.min(state.width * (mobile ? 0.58 : 0.38), state.height * (mobile ? 0.44 : 0.55));
    return {
      centerX,
      centerY,
      maxRadius,
      squashX: mobile ? 1.1 : 1.22,
      squashY: mobile ? 0.45 : 0.36,
      tilt: mobile ? -0.18 : -0.34 + Math.sin(time * 0.00018) * 0.04,
    };
  }

  function orbitPoint(particle, frame, time, offset = 0) {
    const wave = Math.sin(time * 0.0012 + particle.phase) * 0.035;
    const radius = (0.16 + particle.radius * 0.84 + wave) * frame.maxRadius;
    const armTwist = particle.radius * 2.2 + Math.sin(particle.lane * 8.0) * 0.22;
    const angle = particle.angle + armTwist + offset;
    const x = Math.cos(angle) * radius * frame.squashX;
    const y = Math.sin(angle) * radius * frame.squashY;
    const cos = Math.cos(frame.tilt);
    const sin = Math.sin(frame.tilt);
    return {
      x: frame.centerX + x * cos - y * sin,
      y: frame.centerY + x * sin + y * cos,
    };
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, '#08145a');
    gradient.addColorStop(0.38, '#11106a');
    gradient.addColorStop(0.68, '#1a0753');
    gradient.addColorStop(1, '#04112c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawGalaxyGlow(frame) {
    const core = ctx.createRadialGradient(
      frame.centerX,
      frame.centerY,
      0,
      frame.centerX,
      frame.centerY,
      frame.maxRadius * 1.5
    );
    core.addColorStop(0, 'rgba(255, 78, 233, 0.36)');
    core.addColorStop(0.28, 'rgba(94, 102, 255, 0.22)');
    core.addColorStop(0.56, 'rgba(23, 216, 255, 0.13)');
    core.addColorStop(1, 'rgba(3, 8, 28, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawOrbitBands(frame, time) {
    const bands = [
      { radius: 0.44, color: 'rgba(255, 65, 217, 0.74)', width: 10, blur: 24, phase: 0 },
      { radius: 0.58, color: 'rgba(155, 84, 255, 0.62)', width: 12, blur: 28, phase: 1.1 },
      { radius: 0.73, color: 'rgba(38, 230, 255, 0.66)', width: 13, blur: 32, phase: 2.2 },
      { radius: 0.88, color: 'rgba(78, 110, 255, 0.44)', width: 9, blur: 24, phase: 3.1 },
    ];

    ctx.save();
    ctx.translate(frame.centerX, frame.centerY);
    ctx.rotate(frame.tilt);
    ctx.scale(frame.squashX, frame.squashY);
    ctx.globalCompositeOperation = 'lighter';

    bands.forEach((band) => {
      const pulse = 0.82 + Math.sin(time * 0.0016 + band.phase) * 0.18;
      const radius = frame.maxRadius * band.radius;

      ctx.shadowColor = band.color;
      ctx.shadowBlur = band.blur;
      ctx.strokeStyle = band.color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = band.width / frame.squashX;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = pulse * 0.42;
      ctx.lineWidth = (band.width * 2.4) / frame.squashX;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.01, radius * 1.01, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawComets(dt) {
    if (!reduceMotion && Math.random() < 0.024 && state.comets.length < 9) {
      state.comets.push({
        x: random(state.width * 0.04, state.width * 0.94),
        y: random(-80, state.height * 0.36),
        vx: random(-0.18, 0.42),
        vy: random(0.9, 1.75),
        life: random(0.45, 0.95),
        color: Math.random() > 0.5 ? '#28e8ff' : '#a06bff',
      });
    }

    state.comets = state.comets.filter((comet) => {
      comet.x += comet.vx * dt * 60;
      comet.y += comet.vy * dt * 60;
      comet.life -= dt * 0.32;
      const alpha = Math.max(0, comet.life);
      ctx.strokeStyle = comet.color;
      ctx.globalAlpha = alpha * 0.48;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(comet.x - comet.vx * 80 - 34, comet.y - comet.vy * 80 - 46);
      ctx.stroke();
      return alpha > 0 && comet.y < state.height + 120;
    });
    ctx.globalAlpha = 1;
  }

  function drawParticles(time, dt) {
    const frame = getGalaxyFrame(time);
    drawGalaxyGlow(frame);
    drawOrbitBands(frame, time);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    state.particles.forEach((particle) => {
      if (!reduceMotion) {
        const acceleration = 1 + (1 - particle.radius) * 1.25;
        particle.angle += particle.speed * acceleration * dt;
      }

      const point = orbitPoint(particle, frame, time, 0);
      const trail = orbitPoint(particle, frame, time, -0.015 - (1 - particle.radius) * 0.018);
      const pulse = 0.72 + Math.sin(time * 0.003 + particle.phase) * 0.28;
      const alpha = particle.alpha * pulse;

      ctx.strokeStyle = particle.color;
      ctx.globalAlpha = alpha * 0.34;
      ctx.lineWidth = Math.max(0.85, particle.size * 0.9);
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  function draw(time = 0) {
    const dt = Math.min(0.033, Math.max(0.001, (time - state.lastTime) / 1000 || 0.016));
    state.lastTime = time;

    drawBackground();
    const frame = getGalaxyFrame(time);
    drawGalaxyGlow(frame);
    drawComets(dt);
    drawParticles(time, dt);

    if (!reduceMotion) {
      window.requestAnimationFrame(draw);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.mouseX = (event.clientX / state.width - 0.5) * 2;
    state.mouseY = (event.clientY / state.height - 0.5) * 2;
  }, { passive: true });

  resize();
  window.requestAnimationFrame(draw);
})();
