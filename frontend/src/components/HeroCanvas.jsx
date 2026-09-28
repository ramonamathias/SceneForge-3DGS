import React, { useEffect, useRef } from 'react';

export default function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight || 560);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 560;
    };
    window.addEventListener('resize', handleResize);

    // Mouse tracking for parallax
    let targetRotationX = 0.25;
    let targetRotationY = 0.35;
    let rotationX = 0.25;
    let rotationY = 0.35;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / width - 0.5;
      const y = (e.clientY - rect.top) / height - 0.5;
      targetRotationY = x * 1.5;
      targetRotationX = y * 0.8;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    // Generate 3D point cloud representing a complex object / architectural scene
    const numPoints = 380;
    const points = [];
    const colors = [
      'rgba(15, 23, 42, ',    // Onyx / Deep Slate
      'rgba(30, 41, 59, ',    // Midnight Charcoal
      'rgba(71, 85, 105, ',   // Slate Grey
      'rgba(100, 116, 139, ', // Cool Silver Slate
      'rgba(148, 163, 184, ', // Metallic Silver
    ];

    // Create a 3D structural shape (sculpture + room ground plane + arch)
    for (let i = 0; i < numPoints; i++) {
      let x, y, z, colorIdx;

      if (i < 200) {
        // Torus / Complex central sculpture
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const R = 110 + (Math.random() - 0.5) * 15;
        const r = 45 + (Math.random() - 0.5) * 10;
        x = (R + r * Math.cos(v)) * Math.cos(u);
        y = (R + r * Math.cos(v)) * Math.sin(u) * 0.8;
        z = r * Math.sin(v);
        colorIdx = (u > Math.PI ? 0 : 1);
      } else if (i < 300) {
        // Architectural pedestal / room contours
        const angle = Math.random() * Math.PI * 2;
        const rad = 70 + Math.random() * 80;
        x = Math.cos(angle) * rad;
        z = Math.sin(angle) * rad;
        y = 100 + (Math.random() - 0.5) * 30;
        colorIdx = 2;
      } else {
        // Upper ambient splat particles
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const rad = 140 + Math.random() * 40;
        x = rad * Math.sin(phi) * Math.cos(theta);
        y = rad * Math.sin(phi) * Math.sin(theta) * 0.7;
        z = rad * Math.cos(phi);
        colorIdx = 3 + (Math.random() > 0.5 ? 1 : 0);
      }

      points.push({
        x,
        y,
        z,
        size: 2.5 + Math.random() * 4.5,
        colorBase: colors[colorIdx],
        alpha: 0.4 + Math.random() * 0.5,
        eccentricity: 1.2 + Math.random() * 1.5,
        angle: Math.random() * Math.PI,
      });
    }

    // Camera trajectory poses (COLMAP camera frustums)
    const cameraPoses = [];
    const numCameras = 18;
    for (let c = 0; c < numCameras; c++) {
      const angle = (c / numCameras) * Math.PI * 2;
      const radius = 220;
      cameraPoses.push({
        x: Math.cos(angle) * radius,
        y: -30 + Math.sin(angle * 2) * 25,
        z: Math.sin(angle) * radius,
        lookX: 0,
        lookY: 0,
        lookZ: 0,
        index: c + 1,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.008;
      rotationX += (targetRotationX - rotationX) * 0.05;
      rotationY += (targetRotationY - rotationY) * 0.05;

      const autoY = time * 0.35;
      const curRotX = rotationX;
      const curRotY = rotationY + autoY;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const fov = 380;

      // Project 3D point to 2D screen
      const project = (p) => {
        // Rotate Y
        const cosY = Math.cos(curRotY);
        const sinY = Math.sin(curRotY);
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;

        // Rotate X
        const cosX = Math.cos(curRotX);
        const sinX = Math.sin(curRotX);
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const distance = 460 + z2;
        if (distance <= 10) return null;
        const scale = fov / distance;

        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          scale,
          depth: z2,
        };
      };

      // Draw camera trajectory orbit line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.lineWidth = 1.2;
      let firstCamera = true;
      for (let c = 0; c < numCameras; c++) {
        const p2d = project(cameraPoses[c]);
        if (p2d) {
          if (firstCamera) {
            ctx.moveTo(p2d.sx, p2d.sy);
            firstCamera = false;
          } else {
            ctx.lineTo(p2d.sx, p2d.sy);
          }
        }
      }
      ctx.closePath();
      ctx.stroke();

      // Draw camera frustums
      for (let c = 0; c < numCameras; c++) {
        const cam = cameraPoses[c];
        const p2d = project(cam);
        if (!p2d) continue;

        // Draw small camera box
        const size = Math.max(3, 7 * p2d.scale);
        ctx.fillStyle = c % 2 === 0 ? '#09090b' : '#334155';
        ctx.beginPath();
        ctx.arc(p2d.sx, p2d.sy, size * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Draw ray towards center
        const center2d = project({ x: 0, y: 0, z: 0 });
        if (center2d && c % 3 === 0) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
          ctx.moveTo(p2d.sx, p2d.sy);
          ctx.lineTo(center2d.sx, center2d.sy);
          ctx.stroke();
        }
      }

      // Project and sort points by depth (Painter's algorithm)
      const projected = [];
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const p2d = project(pt);
        if (p2d) {
          projected.push({
            pt,
            ...p2d,
          });
        }
      }
      projected.sort((a, b) => b.depth - a.depth);

      // Render Gaussian Splat Primitives (oriented ellipses with soft alpha gradient)
      for (let i = 0; i < projected.length; i++) {
        const item = projected[i];
        const { sx, sy, scale, pt } = item;

        const radX = pt.size * scale * pt.eccentricity;
        const radY = pt.size * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(pt.angle + curRotY * 0.5);

        // Soft radial gradient for Gaussian kernel simulation
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radX);
        grad.addColorStop(0, `${pt.colorBase}${pt.alpha})`);
        grad.addColorStop(0.5, `${pt.colorBase}${pt.alpha * 0.5})`);
        grad.addColorStop(1, `${pt.colorBase}0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Connecting sparse geometry lines for structure feel
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i += 7) {
        const p1 = projected[i];
        const p2 = projected[(i + 3) % projected.length];
        if (p1 && p2 && Math.hypot(p1.sx - p2.sx, p1.sy - p2.sy) < 90) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="hero-canvas-container">
      <canvas ref={canvasRef} className="hero-canvas" />
      <div className="hero-canvas-overlay">
        <div className="telemetry-badge">
          <span className="telemetry-dot" />
          <span>Real-time Gaussian Radiance Kernel • 3DGS</span>
        </div>
      </div>
    </div>
  );
}
