const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const menuItems = document.querySelectorAll('.menu-item');
const container = document.getElementById('canvas-container');

let width, height, nodes = [];
let rotation = 0;
let rotationSpeed = 0.005; // Velocidad base
let targetSpeed = 0.005;   // Velocidad a la que queremos llegar
let isHover = false;
const nodeCount = 110;
const radius = 180;

class Node {
    constructor(i) {
        this.phi = Math.acos(-1 + (2 * i) / nodeCount);
        this.theta = Math.sqrt(nodeCount * Math.PI) * this.phi;
        this.baseX = radius * Math.sin(this.phi) * Math.cos(this.theta);
        this.baseY = radius * Math.sin(this.phi) * Math.sin(this.theta);
        this.baseZ = radius * Math.cos(this.phi);
        this.ex = this.baseX; this.ey = this.baseY; this.ez = this.baseZ;
    }

    update() {
        const limit = Math.min(width, height) * 0.42;
        const targetFactor = isHover ? (limit / radius) : 1;
        // Interpolación para movimiento orgánico de expansión
        this.ex += (this.baseX * targetFactor - this.ex) * 0.1;
        this.ey += (this.baseY * targetFactor - this.ey) * 0.1;
        this.ez += (this.baseZ * targetFactor - this.ez) * 0.1;
    }

    draw() {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rx = this.ex * cos - this.ez * sin;
        const rz = this.ez * cos + this.ex * sin;

        const scale = 600 / (600 - rz);
        const x2d = rx * scale + width / 2;
        const y2d = this.ey * scale + height / 2;
        
        ctx.fillStyle = `rgba(0, 255, 204, ${isHover ? 0.1 : (rz + radius)/(radius*2) + 0.15})`;
        ctx.beginPath();
        ctx.arc(x2d, y2d, 1.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        return {x: x2d, y: y2d, rz: rz, scale: scale};
    }
}

function init() {
    resize();
    nodes = [];
    for (let i = 0; i < nodeCount; i++) nodes.push(new Node(i));
    
    container.addEventListener('mouseenter', () => {
        isHover = true;
        targetSpeed = 0; // Detener suavemente
    });
    container.addEventListener('mouseleave', () => {
        isHover = false;
        targetSpeed = 0.005; // Reanudar suavemente
    });
    window.addEventListener('resize', resize);
}

function resize() {
    width = container.clientWidth;
    height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // Efecto de INERCIA: la velocidad actual persigue a la velocidad objetivo
    rotationSpeed += (targetSpeed - rotationSpeed) * 0.05;
    rotation += rotationSpeed;

    let coords = nodes.map(n => { n.update(); return n.draw(); });

    menuItems.forEach((item, index) => {
        if (!isHover) {
            item.classList.remove('menu-centered');
            const angle = rotation + (index * (Math.PI * 2 / menuItems.length));
            const mx = Math.sin(angle) * (radius + 30);
            const mz = Math.cos(angle) * (radius + 30);
            const mScale = 600 / (600 - mz);
            
            // Profundidad visual: Desenfocar si está atrás (mz negativo)
            const blur = Math.max(0, -mz / 40);
            
            item.style.transform = `translate(-50%, -50%) translate(${mx * mScale}px, 0px) scale(${mScale})`;
            item.style.opacity = (mz + radius) / (radius * 2) + 0.2; 
            item.style.filter = `blur(${blur}px)`;
            item.style.zIndex = Math.round(mz + radius);
        } else {
            item.classList.add('menu-centered');
            item.style.filter = `blur(0px)`;
            const offset = (index - (menuItems.length - 1) / 2) * 125;
            item.style.transform = `translate(-50%, -50%) translate(${offset}px, 0px) scale(1.1)`;
            item.style.opacity = "1";
            item.style.zIndex = "300";
        }
    });

    // Dibujo de líneas con GLOW (Brillo)
    ctx.lineWidth = 0.6;
    for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
            const distLimit = 85 * coords[i].scale;
            const dx = coords[i].x - coords[j].x;
            const dy = coords[i].y - coords[j].y;
            const d2 = dx * dx + dy * dy;
            
            if (d2 < distLimit * distLimit) {
                const d = Math.sqrt(d2);
                const alpha = isHover ? 0.03 : 0.25 * (1 - d / distLimit);
                ctx.strokeStyle = `rgba(0, 255, 180, ${alpha})`;
                
                ctx.beginPath();
                ctx.moveTo(coords[i].x, coords[i].y);
                ctx.lineTo(coords[j].x, coords[j].y);
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animate);
}

init();
animate();