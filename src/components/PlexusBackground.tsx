'use client';

import { useEffect, useRef } from 'react';

const PlexusBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    const connectDistance = 120;
    const connectDistanceSquared = connectDistance * connectDistance;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
      }

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        this.x += this.speedX;
        this.y += this.speedY;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = 'rgba(234,232,255,0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.max(20, Math.floor((canvas.height * canvas.width) / 11000));
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const connectParticles = () => {
        if (!ctx) return;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < connectDistanceSquared) {
            const opacityValue = 1 - distSq / connectDistanceSquared;
            const grad = ctx.createLinearGradient(particles[a].x, particles[a].y, particles[b].x, particles[b].y);
            grad.addColorStop(0, `rgba(192,57,168,${opacityValue})`);
            grad.addColorStop(1, `rgba(91,35,164,${opacityValue})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      connectParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (!animationFrameId) animate();
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    resizeCanvas();
    initParticles();
    startAnimation();

    return () => {
      stopAnimation();
      window.removeEventListener('resize', () => {
        resizeCanvas();
        initParticles();
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <canvas id="plexus-background" ref={canvasRef} />;
};

export default PlexusBackground;
