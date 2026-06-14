(() => {
  const canvas = document.getElementById('auth-galaxy-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    stars: [],
    dust: [],
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
    initParticles();
  }

  function initParticles() {
    const starCount = Math.min(250, Math.floor((state.width * state.height) / 8000));
    state.stars = Array.from({ length: starCount }, () => ({
      x: random(0, state.width * 1.2),
      y: random(0, state.height),
      size: random(0.5, 1.5),
      speed: random(0.1, 0.8),
      alpha: random(0.2, 0.9),
      phase: random(0, Math.PI * 2),
      color: Math.random() > 0.5 ? '#ffffff' : '#ffe0cc',
    }));

    const dustCount = reduceMotion ? 50 : 150;
    state.dust = Array.from({ length: dustCount }, () => ({
      angle: random(0, Math.PI * 2),
      orbitRadius: random(1.2, 3.8),
      speed: random(0.0001, 0.0004),
      size: random(0.8, 2.5),
      alpha: random(0.1, 0.8),
      phase: random(0, Math.PI * 2)
    }));
  }

  function blackHoleFrame() {
    const mobile = state.width < 760;
    const mobileRadius = Math.min(state.height * 0.38, state.width * 0.9);
    return {
      x: state.width * (mobile ? 1.33 : 0.95),
      y: state.height * (mobile ? 0.54 : 0.5),
      radius: mobile ? mobileRadius : Math.max(state.width, state.height) * 0.32,
    };
  }

  function drawBackground() {
    ctx.fillStyle = '#010001';
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawStarfield(frame, time, dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    state.stars.forEach((star) => {
      if (!reduceMotion) {
        star.x -= star.speed * dt * 15;
        if (star.x < -20) {
          star.x = state.width * 1.2 + 20;
          star.y = random(0, state.height);
        }
      }

      const dx = star.x - frame.x;
      const dy = star.y - frame.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      
      let drawX = star.x;
      let drawY = star.y;
      let alpha = star.alpha;
      let stretchX = star.size;
      let stretchY = star.size;
      let rotation = 0;

      // Realistic gravitational lensing (Einstein ring effect)
      if (dist < frame.radius * 6.0) {
        const lensFactor = (frame.radius * frame.radius) / (distSq + 1);
        drawX += (dx / dist) * lensFactor * frame.radius * 1.0;
        drawY += (dy / dist) * lensFactor * frame.radius * 1.0;
        
        // Stretch tangentially
        stretchX = star.size * (1 + lensFactor * 4); 
        stretchY = Math.max(0.1, star.size * (1 - lensFactor * 0.5));
        rotation = Math.atan2(dy, dx) + Math.PI / 2;
        
        if (dist < frame.radius * 1.05) {
            alpha *= Math.pow((dist - frame.radius) / (frame.radius * 0.05), 2);
        }
      }

      const pulse = 0.7 + Math.sin(time * 0.002 + star.phase) * 0.3;
      if (alpha * pulse > 0.01) {
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.min(1, Math.max(0, alpha * pulse));
        ctx.beginPath();
        ctx.ellipse(drawX, drawY, stretchX, stretchY, rotation, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawLensedRings(frame, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.95 + Math.sin(time * 0.002) * 0.05;

    // Ambient warm glow
    const haloRadius = frame.radius * 2.8;
    const haloGradient = ctx.createRadialGradient(
      frame.x, frame.y, frame.radius,
      frame.x, frame.y, haloRadius
    );
    haloGradient.addColorStop(0, `rgba(255, 120, 20, ${Math.min(1, 0.15 * pulse)})`);
    haloGradient.addColorStop(0.3, `rgba(150, 30, 0, ${Math.min(1, 0.05 * pulse)})`);
    haloGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(frame.x, frame.y, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // Einstein ring (lensed back of accretion disc)
    // Replaced buggy shadowBlur with thick semi-transparent overlapping strokes for perfect smooth rendering
    const rings = [
      { r: frame.radius * 1.45, w: frame.radius * 0.4, c: 'rgba(255, 80, 10, 0.15)' },
      { r: frame.radius * 1.45, w: frame.radius * 0.15, c: 'rgba(255, 100, 20, 0.3)' },
      
      { r: frame.radius * 1.32, w: frame.radius * 0.2, c: 'rgba(255, 150, 40, 0.3)' },
      { r: frame.radius * 1.32, w: frame.radius * 0.1, c: 'rgba(255, 170, 60, 0.5)' },
      
      { r: frame.radius * 1.25, w: frame.radius * 0.1, c: 'rgba(255, 220, 120, 0.5)' },
      { r: frame.radius * 1.25, w: frame.radius * 0.04, c: 'rgba(255, 230, 150, 0.8)' },
      
      { r: frame.radius * 1.2, w: frame.radius * 0.03, c: 'rgba(255, 255, 255, 0.7)' },
      { r: frame.radius * 1.2, w: frame.radius * 0.015, c: 'rgba(255, 255, 255, 1.0)' },
    ];

    rings.forEach(ring => {
      ctx.beginPath();
      ctx.arc(frame.x, frame.y, ring.r, 0, Math.PI * 2);
      ctx.lineWidth = ring.w;
      ctx.strokeStyle = ring.c;
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawHorizontalDisc(frame, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    ctx.translate(frame.x, frame.y);
    const tilt = -0.06;
    ctx.rotate(tilt);
    ctx.scale(1, 0.12); // Extremely flat disk

    const diskOuter = frame.radius * 3.8;
    const orbit = time * 0.0004;

    const ringCount = 28;
    for (let i = 0; i < ringCount; i++) {
      const progress = i / (ringCount - 1);
      const rx = frame.radius * 1.15 + progress * (diskOuter - frame.radius * 1.15);
      const ry = rx; 
      
      const alpha = Math.max(0.01, 0.7 - progress * 0.6) * (0.8 + Math.sin(orbit * 5 + i) * 0.2);

      // CRITICAL FIX: Math.min(1, val) to prevent invalid rgba() strings that break strokes and cause glitches
      const c1 = Math.min(1, alpha * 0.4);
      const c2 = Math.min(1, alpha * 1.0);
      const c3 = Math.min(1, alpha * 1.8);
      const c4 = Math.min(1, alpha * 2.5);

      const gradient = ctx.createLinearGradient(-rx, 0, rx, 0);
      gradient.addColorStop(0, 'rgba(40, 10, 0, 0)');
      gradient.addColorStop(0.15, `rgba(200, 40, 0, ${c1})`);
      gradient.addColorStop(0.35, `rgba(255, 160, 40, ${c2})`);
      gradient.addColorStop(0.48, `rgba(255, 240, 200, ${c3})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${c4})`); // Bright hot core
      gradient.addColorStop(0.52, `rgba(255, 240, 200, ${c3})`);
      gradient.addColorStop(0.65, `rgba(255, 160, 40, ${c2})`);
      gradient.addColorStop(0.85, `rgba(200, 40, 0, ${c1})`);
      gradient.addColorStop(1, 'rgba(40, 10, 0, 0)');

      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round'; // Smooth ends
      
      // Draw thicker strokes to naturally overlap and create the glowing volume instead of using buggy shadowBlur
      ctx.lineWidth = frame.radius * 0.03 + progress * frame.radius * 0.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
      
      // Inner bloom
      ctx.lineWidth = frame.radius * 0.01 + progress * frame.radius * 0.03;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  function updatePhysics(dt) {
    if (reduceMotion) return;
    state.dust.forEach((d) => {
      const velocity = 1 / Math.sqrt(Math.max(0.1, d.orbitRadius - 1));
      d.angle += d.speed * dt * 1000 * velocity;
      d.orbitRadius -= (0.00004 * dt * 1000) * velocity; 
      if (d.orbitRadius < 1.15) {
          d.orbitRadius = random(2.8, 3.8);
          d.angle = random(0, Math.PI * 2);
      }
    });
  }

  function drawDustStreams(frame, time, isFront) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tilt = -0.06;

    state.dust.forEach((d) => {
      const sinA = Math.sin(d.angle);
      if (isFront && sinA < 0) return;
      if (!isFront && sinA >= 0) return;

      const r = frame.radius * d.orbitRadius;
      const cosA = Math.cos(d.angle);
      
      let x = cosA * r;
      let y = sinA * r * 0.12; 
      
      if (sinA < 0) {
        const lensPower = Math.max(0, 1 - (d.orbitRadius - 1) * 0.35);
        y -= Math.sin(-d.angle) * frame.radius * 0.55 * lensPower;
      }

      const rx = x * Math.cos(tilt) - y * Math.sin(tilt);
      const ry = x * Math.sin(tilt) + y * Math.cos(tilt);
      
      const finalX = frame.x + rx;
      const finalY = frame.y + ry;

      const pulse = 0.5 + Math.sin(time * 0.004 + d.phase) * 0.5;
      const finalAlpha = d.alpha * pulse;
      if (finalAlpha <= 0.01) return;

      const temp = Math.max(0, Math.min(1, (d.orbitRadius - 1.15) / 2.0));
      const rColor = 255; 
      const gColor = Math.floor(220 - temp * 120);
      const bColor = Math.floor(200 - temp * 180);
      
      ctx.fillStyle = `rgba(${rColor}, ${gColor}, ${bColor}, ${Math.min(1, finalAlpha)})`;
      
      const trailLen = Math.max(1, 15 / d.orbitRadius);
      ctx.beginPath();
      ctx.ellipse(finalX, finalY, d.size * trailLen, d.size, d.angle + tilt + Math.PI/2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSingularity(frame) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(frame.x, frame.y, frame.radius, 0, Math.PI * 2);
    ctx.fill();
    
    const edgeGradient = ctx.createRadialGradient(
      frame.x, frame.y, frame.radius * 0.98,
      frame.x, frame.y, frame.radius * 1.02
    );
    edgeGradient.addColorStop(0, '#000000');
    edgeGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edgeGradient;
    ctx.beginPath();
    ctx.arc(frame.x, frame.y, frame.radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(time = 0) {
    const dt = Math.min(0.033, Math.max(0.001, (time - state.lastTime) / 1000 || 0.016));
    state.lastTime = time;
    const frame = blackHoleFrame();

    updatePhysics(dt);

    drawBackground();
    drawStarfield(frame, time, dt);
    
    drawLensedRings(frame, time);
    drawDustStreams(frame, time, false);
    
    drawSingularity(frame);
    
    drawHorizontalDisc(frame, time);
    drawDustStreams(frame, time, true);

    if (!reduceMotion) {
      window.requestAnimationFrame(draw);
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    state.mouseX = (event.clientX / Math.max(1, state.width) - 0.5) * 2;
    state.mouseY = (event.clientY / Math.max(1, state.height) - 0.5) * 2;
  }, { passive: true });

  resize();
  window.requestAnimationFrame(draw);
})();
