const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const menuItems = document.querySelectorAll('.menu-item');
    const container = document.getElementById('canvas-container');
    
    let width, height, nodes = [];
    let rotation = 0;
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
            
            ctx.fillStyle = `rgba(0, 255, 204, ${isHover ? 0.15 : (rz + radius)/(radius*2) + 0.2})`;
            ctx.beginPath();
            ctx.arc(x2d, y2d, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
            return {x: x2d, y: y2d, rz: rz, scale: scale};
        }
    }

    function init() {
        resize();
        for (let i = 0; i < nodeCount; i++) nodes.push(new Node(i));
        container.addEventListener('mouseenter', () => isHover = true);
        container.addEventListener('mouseleave', () => isHover = false);
        window.addEventListener('resize', resize);
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        if (!isHover) rotation += 0.005;

        let coords = nodes.map(n => { n.update(); return n.draw(); });

        // --- Lógica de la Cinta Rotativa ---
        menuItems.forEach((item, index) => {
            if (!isHover) {
                item.classList.remove('menu-centered');
                
                // Distribución en el ecuador
                const angle = rotation + (index * (Math.PI * 2 / menuItems.length));
                const mx = Math.sin(angle) * (radius + 20);
                const mz = Math.cos(angle) * (radius + 20);
                const mScale = 600 / (600 - mz);
                
                // Aplicamos el desplazamiento desde el centro (50%, 50%)
                item.style.transform = `translate(-50%, -50%) translate(${mx * mScale}px, 0px) scale(${mScale})`;
                item.style.opacity = (mz + radius) / (radius * 2); 
                item.style.zIndex = mz > 0 ? "200" : "1";
            } else {
                item.classList.add('menu-centered');
                const offset = (index - (menuItems.length - 1) / 2) * 110;
                // Centrado absoluto con offset horizontal
                item.style.transform = `translate(-50%, -50%) translate(${offset}px, 0px) scale(1.1)`;
                item.style.opacity = "1";
                item.style.zIndex = "300";
            }
        });

        // Dibujo de líneas
        ctx.lineWidth = 0.5;
        for (let i = 0; i < coords.length; i++) {
            for (let j = i + 1; j < coords.length; j++) {
                const d = Math.hypot(coords[i].x - coords[j].x, coords[i].y - coords[j].y);
                if (d < 90 * coords[i].scale) {
                    ctx.strokeStyle = `rgba(0, 255, 180, ${isHover ? 0.04 : 0.2 * (1 - d/90)})`;
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