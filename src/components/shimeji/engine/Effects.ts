/**
 * Visual effects layer (browser addition – the original engine has none).
 *
 * Effects live in world px, advance on the same 40 ms engine tick as the
 * mascots and are drawn procedurally on the shared canvas after the sprites.
 * They never collide with or block the page.
 */
import type { Environment } from "./Environment";

export type EffectKind = "gunshot" | "slam" | "poof";

type Particle =
  | { t: "flash"; x: number; y: number; dir: number; age: number; life: number }
  | { t: "bullet"; x: number; y: number; vx: number; age: number; life: number }
  | { t: "spark"; x: number; y: number; dir: number; age: number; life: number }
  | { t: "shell"; x: number; y: number; vx: number; vy: number; rot: number; age: number; life: number }
  | { t: "smoke"; x: number; y: number; vx: number; vy: number; r: number; age: number; life: number }
  | { t: "burst"; x: number; y: number; age: number; life: number; seed: number }
  | { t: "dust"; x: number; y: number; vx: number; vy: number; r: number; age: number; life: number }
  | { t: "text"; x: number; y: number; text: string; age: number; life: number }
  | { t: "puff"; x: number; y: number; vx: number; vy: number; r: number; age: number; life: number }
  | { t: "sparkle"; x: number; y: number; vx: number; vy: number; age: number; life: number };

const MAX_PARTICLES = 120;
const BULLET_SPEED = 48;

export class EffectSystem {
  private particles: Particle[] = [];

  constructor(private readonly env: Environment) {}

  get active() {
    return this.particles.length > 0;
  }

  clear() {
    this.particles.length = 0;
  }

  /** dir: +1 = right, -1 = left. (x, y) in world px. */
  spawn(kind: EffectKind, x: number, y: number, dir: 1 | -1) {
    if (this.particles.length > MAX_PARTICLES) return;
    const p = this.particles;
    if (kind === "gunshot") {
      p.push({ t: "flash", x, y, dir, age: 0, life: 3 });
      p.push({ t: "bullet", x: x + dir * 10, y, vx: dir * BULLET_SPEED, age: 0, life: 200 });
      p.push({
        t: "shell",
        x: x - dir * 30,
        y: y - 4,
        vx: -dir * (3 + Math.random() * 2),
        vy: -7 - Math.random() * 3,
        rot: Math.random() * Math.PI,
        age: 0,
        life: 60,
      });
      for (let i = 0; i < 3; i++) {
        p.push({
          t: "smoke",
          x: x + dir * (4 + i * 6),
          y,
          vx: dir * (0.6 + Math.random() * 0.6),
          vy: -0.6 - Math.random() * 0.6,
          r: 4 + i * 2,
          age: 0,
          life: 22 + i * 4,
        });
      }
    } else if (kind === "poof") {
      // costume change: a ball of smoke that hides the swap, plus a few sparkles
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 1.2 + Math.random() * 2.2;
        p.push({
          t: "puff", x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 14,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 0.4,
          r: 14 + Math.random() * 12, age: 0, life: 14 + Math.random() * 8,
        });
      }
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        p.push({ t: "sparkle", x, y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 - 1, age: 0, life: 12 + Math.random() * 6 });
      }
    } else {
      p.push({ t: "burst", x, y, age: 0, life: 12, seed: Math.random() * 1000 });
      // keep the pop-up text inside the viewport when landing near a wall
      const wa = this.env.workArea;
      const tx = Math.min(Math.max(x, wa.left + 95), wa.right - 95);
      p.push({ t: "text", x: tx, y: y - 120, text: "SLAM IT!", age: 0, life: 32 });
      for (let i = 0; i < 10; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        p.push({
          t: "dust",
          x: x + side * (10 + Math.random() * 10),
          y: y - 4,
          vx: side * (2 + Math.random() * 4),
          vy: -1 - Math.random() * 2.5,
          r: 6 + Math.random() * 8,
          age: 0,
          life: 16 + Math.random() * 10,
        });
      }
    }
  }

  tick() {
    const wa = this.env.workArea;
    const next: Particle[] = [];
    for (const q of this.particles) {
      q.age++;
      switch (q.t) {
        case "bullet": {
          q.x += q.vx;
          if (q.x <= wa.left || q.x >= wa.right) {
            const edge = q.x <= wa.left ? wa.left : wa.right;
            next.push({ t: "spark", x: edge, y: q.y, dir: q.vx > 0 ? -1 : 1, age: 0, life: 7 });
            continue;
          }
          break;
        }
        case "shell": {
          q.vy += 1.2;
          q.x += q.vx;
          q.y += q.vy;
          q.rot += 0.6;
          if (q.y >= wa.bottom - 2 && q.vy > 0) {
            q.y = wa.bottom - 2;
            q.vy *= -0.45;
            q.vx *= 0.6;
          }
          break;
        }
        case "sparkle": {
          q.x += q.vx;
          q.y += q.vy;
          q.vx *= 0.9;
          q.vy *= 0.9;
          break;
        }
        case "puff":
        case "smoke":
        case "dust": {
          q.x += q.vx;
          q.y += q.vy;
          q.vx *= 0.9;
          q.vy *= 0.92;
          q.r += q.t === "smoke" ? 0.8 : q.t === "puff" ? 1.1 : 0.6;
          break;
        }
      }
      if (q.age < q.life) next.push(q);
    }
    this.particles = next;
  }

  render(ctx: CanvasRenderingContext2D, s: number) {
    for (const q of this.particles) {
      const k = q.age / q.life; // 0 → 1
      ctx.save();
      switch (q.t) {
        case "flash":
          drawFlash(ctx, q.x * s, q.y * s, q.dir, s, 1 - k);
          break;
        case "bullet": {
          const len = 70 * s;
          const x = q.x * s;
          const y = q.y * s;
          const g = ctx.createLinearGradient(x, y, x - Math.sign(q.vx) * len, y);
          g.addColorStop(0, "rgba(255,248,220,1)");
          g.addColorStop(0.25, "rgba(255,196,90,0.85)");
          g.addColorStop(1, "rgba(255,150,40,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = Math.max(1.5, 3 * s);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - Math.sign(q.vx) * len, y);
          ctx.stroke();
          break;
        }
        case "spark": {
          ctx.translate(q.x * s, q.y * s);
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = "#ffd27a";
          ctx.lineWidth = Math.max(1, 2 * s);
          for (let i = 0; i < 7; i++) {
            const a = (q.dir > 0 ? 0 : Math.PI) + (i / 6 - 0.5) * 2.2;
            const r0 = 3 * s + k * 10 * s;
            const r1 = r0 + (8 + (i % 3) * 5) * s * (1 - k * 0.5);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
            ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.stroke();
          }
          break;
        }
        case "shell": {
          ctx.translate(q.x * s, q.y * s);
          ctx.rotate(q.rot);
          ctx.globalAlpha = Math.min(1, (1 - k) * 3);
          ctx.fillStyle = "#c9932f";
          ctx.strokeStyle = "#6b4a12";
          ctx.lineWidth = 1;
          ctx.fillRect(-4 * s, -1.6 * s, 8 * s, 3.2 * s);
          ctx.strokeRect(-4 * s, -1.6 * s, 8 * s, 3.2 * s);
          break;
        }
        case "smoke": {
          const r = q.r * s;
          const g = ctx.createRadialGradient(q.x * s, q.y * s, 0, q.x * s, q.y * s, r);
          g.addColorStop(0, "rgba(225,225,230,0.55)");
          g.addColorStop(1, "rgba(225,225,230,0)");
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q.x * s, q.y * s, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "dust": {
          ctx.globalAlpha = 0.55 * (1 - k);
          ctx.fillStyle = "#9a948c";
          ctx.beginPath();
          ctx.arc(q.x * s, q.y * s, q.r * s, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "puff": {
          const r = q.r * s;
          const g = ctx.createRadialGradient(q.x * s - r * 0.3, q.y * s - r * 0.3, r * 0.1, q.x * s, q.y * s, r);
          g.addColorStop(0, "rgba(250,250,252,0.95)");
          g.addColorStop(0.7, "rgba(205,208,216,0.85)");
          g.addColorStop(1, "rgba(180,184,194,0)");
          ctx.globalAlpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q.x * s, q.y * s, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "sparkle": {
          const r = (6 - k * 4) * s;
          ctx.translate(q.x * s, q.y * s);
          ctx.rotate(k * 2);
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = "#ffe27a";
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 === 0 ? r : r * 0.3;
            const a = (i / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "burst":
          drawBurst(ctx, q.x * s, q.y * s, s, k, q.seed);
          break;
        case "text":
          drawSlamText(ctx, q.x * s, q.y * s, s, q.text, q.age, q.life);
          break;
      }
      ctx.restore();
    }
  }
}

function drawFlash(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, s: number, a: number) {
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(8 * s, 0, 0, 8 * s, 0, 22 * s);
  g.addColorStop(0, "rgba(255,255,235,1)");
  g.addColorStop(0.35, "rgba(255,210,90,0.95)");
  g.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  // forward cone + small side flares
  ctx.moveTo(0, -5 * s);
  ctx.lineTo(30 * s, -2 * s);
  ctx.lineTo(36 * s, 0);
  ctx.lineTo(30 * s, 2 * s);
  ctx.lineTo(0, 5 * s);
  ctx.lineTo(8 * s, 12 * s);
  ctx.lineTo(4 * s, 0);
  ctx.lineTo(8 * s, -12 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6 * s, 0, 9 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Comic impact star like the guide's "Slam It" preview. */
function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, k: number, seed: number) {
  const grow = 0.55 + Math.min(1, k * 3) * 0.6;
  const fade = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  ctx.translate(x, y);
  ctx.globalAlpha = fade;
  const spikes = 14;
  const star = (outer: number, inner: number) => {
    ctx.beginPath();
    for (let i = 0; i <= spikes * 2; i++) {
      // only the upper half: the floor clips the lower half
      const a = Math.PI + (i / (spikes * 2)) * Math.PI;
      const jitter = 0.75 + 0.5 * Math.abs(Math.sin(seed + i * 12.9898));
      const r = (i % 2 === 0 ? outer * jitter : inner) * s * grow;
      ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r);
    }
    ctx.closePath();
  };
  star(78, 30);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, 3 * s);
  ctx.strokeStyle = "#141414";
  ctx.stroke();
  star(54, 22);
  ctx.fillStyle = "#ff9a2e";
  ctx.fill();
  star(30, 14);
  ctx.fillStyle = "#ffe08a";
  ctx.fill();
  // shockwave ring along the floor
  ctx.globalAlpha = fade * 0.8;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, 2.5 * s * (1 - k));
  ctx.beginPath();
  ctx.ellipse(0, 0, (40 + k * 110) * s, (6 + k * 10) * s, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function drawSlamText(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, text: string, age: number, life: number) {
  const pop = age < 4 ? 0.4 + (age / 4) * 0.8 : age < 7 ? 1.2 - ((age - 4) / 3) * 0.2 : 1;
  const fade = age > life - 8 ? (life - age) / 8 : 1;
  ctx.translate(x, y - Math.min(age, 10) * 1.2 * s);
  ctx.rotate(-0.12);
  ctx.scale(pop, pop);
  ctx.globalAlpha = Math.max(0, fade);
  ctx.font = `italic 900 ${Math.round(30 * s)}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, 7 * s);
  ctx.strokeStyle = "#111111";
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 0, 0);
}
