
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  // Mobile navigation
  const menuBtn = $("#menuBtn");
  const navLinks = $("#navLinks");
  menuBtn?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "✕" : "☰";
  });
  $$("#navLinks a").forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded","false");
    if (menuBtn) menuBtn.textContent = "☰";
  }));

  // Current year
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Scroll progress + compact nav + back-to-top
  const nav = $(".nav");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");
  const updateScrollUI = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    nav.classList.toggle("scrolled", window.scrollY > 18);
    toTop.classList.toggle("show", window.scrollY > 600);
  };
  window.addEventListener("scroll", updateScrollUI, {passive:true});
  updateScrollUI();
  toTop.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

  // Active navigation based on visible sections
  const sectionLinks = $$(".nav-links a[href^='#']");
  const sections = sectionLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  }, {rootMargin:"-35% 0px -55% 0px", threshold:0});
  sections.forEach(section => observer.observe(section));

  // Cursor glow — desktop only.
  const glow = $("#cursorGlow");
  if (glow && matchMedia("(pointer:fine)").matches) {
    window.addEventListener("pointermove", e => {
      glow.style.opacity = "1";
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, {passive:true});
    document.addEventListener("mouseleave", () => glow.style.opacity = "0");
  }

  // Scroll reveal
  const revealTargets = $$(".section > .container");
  revealTargets.forEach(el => el.classList.add("reveal-on-scroll"));
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.12});
  revealTargets.forEach(el => revealObserver.observe(el));

  // Project filtering
  const filters = $$(".filter-btn");
  const projects = $$(".project");
  filters.forEach(btn => btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    projects.forEach(project => {
      const categories = project.dataset.category || "";
      project.classList.toggle("is-hidden", filter !== "all" && !categories.includes(filter));
    });
  }));

  // Gentle 3D tilt for cards — disabled on touch/reduced motion.
  const canTilt = matchMedia("(pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches;
  if (canTilt) {
    $$(".project, .skill-card").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        const intensity = card.classList.contains("project") ? 5 : 3.5;
        card.style.transform = `perspective(900px) rotateX(${(-y*intensity).toFixed(2)}deg) rotateY(${(x*intensity).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  // Existing contact form: opens a prepared email without a backend.
  $("#contactForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    const note = $("#formNote");
    if (note) note.textContent = "Opening your email application with a prepared message…";
    window.location.href = `mailto:mrkinggodhari24@gmail.com?subject=${subject}&body=${body}`;
  });

  // Scratch / brush reveal — preserved from the original portfolio, with safer resize handling.
  (() => {
    const hero = $(".hero"), canvas = $("#scratchCanvas");
    if (!hero || !canvas) return;
    const ctx = canvas.getContext("2d", {alpha:true});
    const topImage = new Image();
    topImage.src = "assets/harish-front.png";
    const stamps = [];
    const lifeMs = 2700;
    let radius=0,dpr=1,w=0,h=0,active=false,hasEntered=false,lastStamp=null;
    let target={x:0,y:0},smooth={x:0,y:0},lastFrame=performance.now();
    const badge=$("#revealBadge");

    function resize(){
      const rect=hero.getBoundingClientRect(); w=rect.width; h=rect.height;
      dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
      canvas.style.width=w+"px"; canvas.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      radius=Math.min(w,h)*(matchMedia("(pointer:coarse)").matches?.105:.095);
      render(performance.now());
    }
    function pos(e){const r=hero.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
    function enter(e){const p=pos(e);active=true;hasEntered=true;target={...p};smooth={...p};lastStamp={...p};badge?.classList.add("show");addStamp(p,0)}
    function move(e){const p=pos(e);if(!active){enter(e);return}target=p}
    function leave(){active=false;lastStamp=null}
    function addStamp(p,angle){stamps.push({x:p.x,y:p.y,r:radius,angle,born:performance.now(),seed:Math.random()*1000})}
    function stampPath(a,b){
      const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);if(!dist)return;
      const angle=Math.atan2(dy,dx),spacing=Math.max(3,radius*.09),count=Math.max(1,Math.ceil(dist/spacing));
      for(let i=1;i<=count;i++){const t=i/count;addStamp({x:a.x+dx*t,y:a.y+dy*t},angle)}
    }
    function smoothPoints(now){
      if(!active||!hasEntered)return;
      const dt=Math.min(.05,Math.max(.001,(now-lastFrame)/1000)),k=1-Math.pow(1-.17,dt*60),prev={...smooth};
      smooth.x+=(target.x-smooth.x)*k;smooth.y+=(target.y-smooth.y)*k;
      if(!lastStamp)lastStamp={...smooth};stampPath(lastStamp,smooth);lastStamp={...smooth};
      if(Math.hypot(smooth.x-prev.x,smooth.y-prev.y)<.15)lastStamp={...smooth};
    }
    function organicBrush(s,now,r){
      const pts=[],n=48,age=(now-s.born)/1000,time=age*2.5,seed=s.seed;
      const sx=1+Math.min(.22,Math.abs(Math.cos(s.angle))*.18),sy=1+Math.min(.22,Math.abs(Math.sin(s.angle))*.18);
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2,noise=1+.085*Math.sin(3*a+time+seed)+.048*Math.sin(5*a-time*1.15+seed*2.1)+.022*Math.sin(9*a+time*.6+seed*3.7)+.018*Math.sin(13*a-seed*1.7);
        const rr=r*noise,lx=Math.cos(a)*rr*sx,ly=Math.sin(a)*rr*sy,ca=Math.cos(s.angle),sa=Math.sin(s.angle);
        pts.push({x:s.x+lx*ca-ly*sa,y:s.y+lx*sa+ly*ca});
      }
      ctx.beginPath();
      for(let i=0;i<n;i++){
        const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
        const c1={x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},c2={x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6};
        if(i===0)ctx.moveTo(p1.x,p1.y);ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p2.x,p2.y);
      }
      ctx.closePath();ctx.fill();
    }
    function drawTop(){
      if(!topImage.complete||!topImage.naturalWidth){ctx.fillStyle="#0b111b";ctx.fillRect(0,0,w,h);return}
      const scale=Math.max(w/topImage.naturalWidth,h/topImage.naturalHeight),dw=topImage.naturalWidth*scale,dh=topImage.naturalHeight*scale;
      ctx.drawImage(topImage,(w-dw)/2,(h-dh)*.34,dw,dh);
      ctx.fillStyle="rgba(5,10,18,.12)";ctx.fillRect(0,0,w,h);
    }
    function render(now){
      if(!w||!h)return;ctx.clearRect(0,0,w,h);drawTop();ctx.globalCompositeOperation="destination-out";
      for(let i=stamps.length-1;i>=0;i--){const s=stamps[i],age=now-s.born;if(age>=lifeMs){stamps.splice(i,1);continue}const life=Math.max(0,1-age/lifeMs),r=s.r*Math.pow(life,.85);if(r>1.2)organicBrush(s,now,r)}
      ctx.globalCompositeOperation="source-over";
    }
    function frame(now){smoothPoints(now);render(now);lastFrame=now;requestAnimationFrame(frame)}
    hero.addEventListener("pointerenter",e=>{if(e.pointerType!=="touch")enter(e)});
    hero.addEventListener("pointermove",e=>{if(e.pointerType!=="touch")move(e)});
    hero.addEventListener("pointerleave",e=>{if(e.pointerType!=="touch")leave()});
    hero.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.pointerType==="pen"){e.preventDefault();enter(e)}},{passive:false});
    hero.addEventListener("pointermove",e=>{if(e.pointerType==="touch"||e.pointerType==="pen"){e.preventDefault();move(e)}},{passive:false});
    hero.addEventListener("pointerup",e=>{if(e.pointerType==="touch"||e.pointerType==="pen")leave()});
    hero.addEventListener("pointercancel",leave);
    addEventListener("resize",resize);
    topImage.onload=resize; resize(); requestAnimationFrame(frame);
  })();
})();
