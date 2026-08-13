import React, { useEffect, useRef } from 'react';

export default function WeatherSkyCanvas({ climaData, resolvedTheme }) {
  const canvasRef = useRef(null);

  const temp = climaData?.modo_urbano?.temperatura_c ?? 15;
  const precip = climaData?.modo_agricola?.lluvia_caida_hoy_mm ?? 0;
  const isNight = resolvedTheme === 'dark';

  // Determinar atmósfera
  let skyType = 'day-sunny';
  let particleType = 'sun-motes'; // 'rain' | 'snow' | 'stars' | 'sun-motes'

  if (precip > 0.3) {
    skyType = 'rainy';
    particleType = 'rain';
  } else if (temp <= 2) {
    skyType = 'frost-cold';
    particleType = 'snow';
  } else if (temp >= 26) {
    skyType = 'warm-sunny';
    particleType = 'sun-motes';
  }

  if (isNight) {
    skyType = 'night-clear';
    if (precip <= 0.3 && temp > 2) {
      particleType = 'stars';
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Inicializar partículas atmosféricas
    const count = particleType === 'rain' ? 80 : particleType === 'snow' ? 50 : 40;
    const particles = Array.from({ length: count }, () => {
      if (particleType === 'rain') {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 20 + 10,
          speed: Math.random() * 8 + 12,
          opacity: Math.random() * 0.4 + 0.2
        };
      } else if (particleType === 'snow') {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.5 + 1,
          speed: Math.random() * 1.5 + 0.6,
          sway: Math.random() * 1.5,
          opacity: Math.random() * 0.6 + 0.3
        };
      } else if (particleType === 'stars') {
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.4 + 0.4,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          opacity: Math.random() * 0.8 + 0.2
        };
      } else {
        // Sun-motes / polen atmosférico cálido
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2 + 0.8,
          speedY: Math.random() * 0.4 - 0.2,
          speedX: Math.random() * 0.4 - 0.2,
          opacity: Math.random() * 0.35 + 0.1
        };
      }
    });

    let tick = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      particles.forEach((p) => {
        if (particleType === 'rain') {
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.opacity})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.length);
          ctx.stroke();

          p.y += p.speed;
          p.x -= 1;
          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        } else if (particleType === 'snow') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x + Math.sin(tick * 0.02 + p.sway) * 2, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speed;
          if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        } else if (particleType === 'stars') {
          const currentOpacity = (Math.sin(tick * p.twinkleSpeed) + 1) * 0.5 * p.opacity;
          ctx.fillStyle = `rgba(248, 250, 252, ${currentOpacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(254, 240, 138, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleType]);

  return (
    <div className={`weather-sky-canvas sky-${skyType}`}>
      <div className="sky-orb orb-primary" />
      <div className="sky-orb orb-secondary" />
      <div className="sky-orb orb-tertiary" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full" />
    </div>
  );
}
