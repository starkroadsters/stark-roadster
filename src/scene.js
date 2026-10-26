/*
 * Self-contained real-time WebGL 3D renderer.
 * Vehicle geometry is a PROCEDURAL, F1-INSPIRED illustrative open-wheel concept.
 * It is not an actual Stark Roadsters competition vehicle or a representation of specs,
 * and it uses no real team liveries, sponsor marks or trademarks.
 * No third-party CDN or external runtime dependencies are required.
 */
const PALETTE = Object.freeze({
  taupe: "#807473",
  blue: "#1763A0",
  royal: "#1C278A",
  crimson: "#970F12",
  gold: "#997725",
  navy: "#091239",
  glass: "#18335E",
  tyre: "#101727",
  offWhite: "#CFD8EC",
  gunmetal: "#24354D"
});

const RGB = (hex) => {
  const n = parseInt(hex.replace("#",""),16);
  return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255];
};
const clamp = (n, lo, hi) => Math.max(lo,Math.min(hi,n));
const lerp = (a,b,t) => a+(b-a)*t;
const cross = (a,b) => [
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const normalized = (v) => {
  const mag = Math.hypot(...v)||1;
  return v.map(n=>n/mag);
};

class Mesh {
  constructor() { this.verts=[]; }
  tri(a,b,c,color) {
    const normal=normalized(cross(sub(b,a),sub(c,a)));
    const rgb=typeof color==="string" ? RGB(color) : color;
    for(const p of [a,b,c]) this.verts.push(...p,...normal,...rgb);
  }
  quad(a,b,c,d,color) {
    this.tri(a,b,c,color);
    this.tri(a,c,d,color);
  }
  box(cx,cy,cz,w,h,d,color,topColor=color,sideColor=color) {
    const x=cx-w/2, X=cx+w/2, y=cy-h/2, Y=cy+h/2, z=cz-d/2, Z=cz+d/2;
    this.quad([x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z],topColor);
    this.quad([x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z],color);
    this.quad([X,y,z],[x,y,z],[x,Y,z],[X,Y,z],sideColor);
    this.quad([x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z],sideColor);
    this.quad([X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z],sideColor);
    this.quad([x,y,z],[X,y,z],[X,y,Z],[x,y,Z],color);
  }
  cylinderX(cx,cy,cz,r,w,side,face,n=28) {
    const xa=cx-w/2, xb=cx+w/2, sideRGB=side, faceRGB=face;
    for(let i=0;i<n;i++){
      const t1=i*Math.PI*2/n,t2=(i+1)*Math.PI*2/n;
      const y1=cy+Math.cos(t1)*r,z1=cz+Math.sin(t1)*r;
      const y2=cy+Math.cos(t2)*r,z2=cz+Math.sin(t2)*r;
      this.quad([xa,y1,z1],[xb,y1,z1],[xb,y2,z2],[xa,y2,z2],sideRGB);
      this.tri([xa,cy,cz],[xa,y2,z2],[xa,y1,z1],faceRGB);
      this.tri([xb,cy,cz],[xb,y1,z1],[xb,y2,z2],faceRGB);
    }
  }
  sphere(cx,cy,cz,r,color,seg=10) {
    const P=(i,j)=>{
      const th=Math.PI*i/seg, ph=2*Math.PI*j/seg;
      return [cx+r*Math.sin(th)*Math.cos(ph), cy+r*Math.cos(th), cz+r*Math.sin(th)*Math.sin(ph)];
    };
    for(let i=0;i<seg;i++) for(let j=0;j<seg;j++)
      this.quad(P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1),color);
  }
  toGpu(gl) {
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.verts),gl.STATIC_DRAW);
    return {buffer,count:this.verts.length/9};
  }
}

function buildF1Car() {
  const m=new Mesh();
  // Tapered quad-section loft between two rectangular cross-sections.
  const loft=(A,B,top,side,bottom)=>{
    const a0=[-A.w,A.yb,A.z],a1=[A.w,A.yb,A.z],a2=[A.w,A.yt,A.z],a3=[-A.w,A.yt,A.z];
    const b0=[-B.w,B.yb,B.z],b1=[B.w,B.yb,B.z],b2=[B.w,B.yt,B.z],b3=[-B.w,B.yt,B.z];
    m.quad(a3,a2,b2,b3,top);
    m.quad(a0,b0,b1,a1,bottom);
    m.quad(a1,b1,b2,a2,side);
    m.quad(a0,a3,b3,b0,side);
    m.quad(b0,b1,b2,b3,side);
  };
  // Thin structural member approximated with an oriented-enough box.
  const rod=(p,q,t,color)=>m.box(
    (p[0]+q[0])/2,(p[1]+q[1])/2,(p[2]+q[2])/2,
    Math.abs(q[0]-p[0])+t,Math.abs(q[1]-p[1])+t,Math.abs(q[2]-p[2])+t,color);

  // Monocoque tub and sidepods with inlets and gold accent strips.
  m.box(0,.36,.1,.46,.24,2.5,PALETTE.gunmetal,PALETTE.royal,PALETTE.gunmetal);
  for(const s of [-1,1]){
    m.box(s*.46,.3,.12,.34,.26,1.7,PALETTE.royal,PALETTE.blue,PALETTE.royal);
    m.box(s*.64,.36,.12,.02,.04,1.5,PALETTE.gold);
    m.box(s*.63,.44,.66,.16,.1,.24,PALETTE.gunmetal);
  }

  // Long pointed nose cone.
  loft({z:1.25,w:.22,yb:.27,yt:.5},{z:2.5,w:.06,yb:.14,yt:.22},
    PALETTE.blue,PALETTE.royal,PALETTE.gunmetal);

  // Open cockpit, driver helmet, visor and titanium halo.
  m.box(0,.5,.05,.4,.02,.85,"#050A1E");
  m.sphere(0,.6,.02,.12,PALETTE.blue,10);
  m.box(0,.62,.13,.14,.06,.04,PALETTE.glass);
  const halo=[];
  for(let i=0;i<=10;i++){
    const t=Math.PI*i/10;
    halo.push([-.28*Math.cos(t),.8,.25+.3*Math.sin(t)]);
  }
  for(let i=0;i<halo.length-1;i++) rod(halo[i],halo[i+1],.05,PALETTE.taupe);
  for(const s of [-1,1]) rod([s*.28,.5,.25],[s*.28,.8,.25],.05,PALETTE.taupe);

  // Airbox and tapered engine cover with gold centre stripe.
  m.box(0,.78,-.12,.26,.36,.55,PALETTE.royal,PALETTE.blue,PALETTE.royal);
  m.box(0,.97,-.02,.12,.12,.2,PALETTE.gunmetal);
  loft({z:-.38,w:.2,yb:.5,yt:.8},{z:-1.38,w:.1,yb:.42,yt:.6},
    PALETTE.blue,PALETTE.royal,PALETTE.gunmetal);
  m.box(0,.715,-.85,.035,.01,.9,PALETTE.gold);
  m.box(0,.52,-1.42,.08,.04,.02,PALETTE.crimson);

  // Front wing: main plane, flap, endplates and nose pylon.
  m.box(0,.14,2.58,2.3,.03,.34,PALETTE.royal,PALETTE.blue,PALETTE.royal);
  m.box(0,.2,2.5,2.2,.025,.2,PALETTE.blue,PALETTE.blue,PALETTE.royal);
  m.box(0,.25,2.46,1.2,.02,.14,PALETTE.crimson);
  for(const s of [-1,1]) m.box(s*1.16,.2,2.6,.03,.3,.46,PALETTE.crimson);
  m.box(0,.3,2.42,.12,.12,.2,PALETTE.gunmetal);

  // Floor, diffuser and rear wing (main plane, flap, endplates, pylon).
  m.box(0,.12,-1.6,1.3,.04,1.2,PALETTE.royal,PALETTE.blue,PALETTE.royal);
  m.box(0,.2,-2.15,1.1,.14,.5,PALETTE.gunmetal,PALETTE.gunmetal,PALETTE.royal);
  m.box(0,1.0,-2.5,1.95,.04,.34,PALETTE.royal,PALETTE.blue,PALETTE.royal);
  m.box(0,1.06,-2.42,1.85,.03,.2,PALETTE.blue,PALETTE.blue,PALETTE.royal);
  for(const s of [-1,1]) m.box(s*.98,.9,-2.5,.03,.34,.46,PALETTE.crimson);
  m.box(0,.7,-2.2,.08,.55,.12,PALETTE.gunmetal);

  // Suspension arms.
  for(const s of [-1,1]){
    rod([s*.2,.36,1.1],[s*.98,.34,1.5],.05,PALETTE.gunmetal);
    rod([s*.2,.5,1.0],[s*.9,.4,1.5],.04,PALETTE.gunmetal);
    rod([s*.25,.4,-1.0],[s*1.05,.36,-1.5],.05,PALETTE.gunmetal);
  }

  // Four exposed open wheels with tyre, rim, and gold hub.
  const wheel=(s,z,r,halfW)=>{
    const x=s*1.02;
    m.cylinderX(x,r,z,r,halfW*2,PALETTE.tyre,PALETTE.tyre,28);
    m.cylinderX(x+s*(halfW+.005),r,z,r*.66,.01,PALETTE.taupe,PALETTE.gunmetal,24);
    m.cylinderX(x+s*(halfW+.02),r,z,r*.22,.02,PALETTE.gold,PALETTE.gold,20);
  };
  for(const s of [-1,1]){
    wheel(s,1.5,.34,.21);
    wheel(s,-1.5,.36,.27);
  }
  return m;
}

function buildGround(){
  const m=new Mesh();
  m.box(0,-.056,0,20,.055,30,"#07122C","#0B1A3D","#091239");
  for(let x=-10;x<=10;x++){
    m.box(x,-.019,0,.008,.005,28,
      x%5===0 ? "#1A3561" : "#11254B");
  }
  for(let z=-14;z<=14;z++){
    m.box(0,-.018,z,20,.005,.009,
      z%5===0 ? "#1A3561" : "#11254B");
  }
  // Isolated gold guiding stripes, understated.
  for(const s of [-1,1]){
    m.box(s*2.12,-.009,0,.012,.005,12,PALETTE.gold);
  }
  return m;
}

const mat4={
  perspective(fov,aspect,near,far){
    const f=1/Math.tan(fov/2), nf=1/(near-far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  },
  lookAt(e,c,up=[0,1,0]){
    const z=normalized(sub(e,c)),x=normalized(cross(up,z)),y=cross(z,x);
    return new Float32Array([
      x[0],y[0],z[0],0,
      x[1],y[1],z[1],0,
      x[2],y[2],z[2],0,
      -x[0]*e[0]-x[1]*e[1]-x[2]*e[2],
      -y[0]*e[0]-y[1]*e[1]-y[2]*e[2],
      -z[0]*e[0]-z[1]*e[1]-z[2]*e[2],1
    ]);
  },
  multiply(a,b){
    const out=new Float32Array(16);
    for(let col=0;col<4;col++){
      for(let row=0;row<4;row++){
        let n=0;
        for(let k=0;k<4;k++) n+=a[k*4+row]*b[col*4+k];
        out[col*4+row]=n;
      }
    }
    return out;
  },
  rotateY(theta){
    const c=Math.cos(theta),s=Math.sin(theta);
    return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
  },
  identity(){ return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
};

function shader(gl,type,source){
  const sh=gl.createShader(type);
  gl.shaderSource(sh,source); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
    throw new Error("3D shader error: "+gl.getShaderInfoLog(sh));
  }
  return sh;
}
function createProgram(gl){
  const vs=shader(gl,gl.VERTEX_SHADER,`
    attribute vec3 a_position;
    attribute vec3 a_normal;
    attribute vec3 a_color;
    uniform mat4 u_vp;
    uniform mat4 u_model;
    varying vec3 v_normal;
    varying vec3 v_color;
    varying vec3 v_world;
    void main() {
      vec4 world = u_model * vec4(a_position, 1.0);
      v_world = world.xyz;
      v_normal = mat3(u_model)*a_normal;
      v_color = a_color;
      gl_Position = u_vp*world;
    }
  `);
  const fs=shader(gl,gl.FRAGMENT_SHADER,`
    precision mediump float;
    varying vec3 v_normal;
    varying vec3 v_color;
    varying vec3 v_world;
    uniform vec3 u_eye;
    void main() {
      vec3 n=normalize(v_normal);
      vec3 facing=normalize(u_eye-v_world);
      if(dot(n,facing)<0.0) n=-n;
      vec3 l=normalize(vec3(-0.55,1.0,0.75));
      vec3 viewDir=normalize(u_eye-v_world);
      float diff=max(dot(n,l),0.0);
      float fill=max(dot(n,normalize(vec3(0.6,0.4,-0.7))),0.0);
      float rim=pow(1.0-max(dot(n,viewDir),0.0),2.6);
      vec3 color=v_color*(0.56+diff*0.45+fill*0.16);
      color+=vec3(0.19,0.29,0.52)*rim*0.20;
      float fog=smoothstep(10.0,23.0,distance(u_eye,v_world));
      color=mix(color,vec3(0.035,0.065,0.17),fog*.62);
      gl_FragColor=vec4(color,1.0);
    }
  `);
  const p=gl.createProgram();
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  gl.deleteShader(vs);gl.deleteShader(fs);
  return p;
}

export function createCarExperience(canvas, {reducedMotion=false}={}) {
  const gl=canvas.getContext("webgl",{antialias:true,alpha:false,depth:true,powerPreference:"high-performance"});
  if(!gl) throw new Error("WebGL is unavailable");
  const program=createProgram(gl);
  const car=buildF1Car().toGpu(gl);
  const ground=buildGround().toGpu(gl);
  const attr={
    pos:gl.getAttribLocation(program,"a_position"),
    normal:gl.getAttribLocation(program,"a_normal"),
    color:gl.getAttribLocation(program,"a_color")
  };
  const uniform={
    vp:gl.getUniformLocation(program,"u_vp"),
    model:gl.getUniformLocation(program,"u_model"),
    eye:gl.getUniformLocation(program,"u_eye")
  };
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(.026,.049,.13,1);
  let w=1,h=1,scrollProgress=0,orbitAngle=0,orbitTilt=0,dragging=false;
  let userMotion=!reducedMotion,visible=true,raf=0,previousTime=0,animationTick=0;
  let angle=0,tilt=.32,dragX=0,dragY=0;
  const resize=()=>{
    const rect=canvas.getBoundingClientRect();
    const ratio=Math.min(window.devicePixelRatio||1,1.65);
    w=Math.max(2,Math.round(rect.width*ratio));
    h=Math.max(2,Math.round(rect.height*ratio));
    if(canvas.width!==w||canvas.height!==h){
      canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h);
    }
  };
  resize();
  const ro=new ResizeObserver(resize);
  ro.observe(canvas);

  const pointerStart={x:0,y:0,a:0,t:0};
  const onDown=e=>{
    if(e.pointerType==="mouse" && e.button!==0) return;
    dragging=true;
    pointerStart.x=e.clientX; pointerStart.y=e.clientY;
    pointerStart.a=orbitAngle;pointerStart.t=orbitTilt;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove=e=>{
    if(!dragging)return;
    orbitAngle=clamp(pointerStart.a+(e.clientX-pointerStart.x)*.008,-Math.PI*1.7,Math.PI*1.7);
    orbitTilt=clamp(pointerStart.t-(e.clientY-pointerStart.y)*.004,-.24,.75);
  };
  const onUp=()=>{dragging=false;};
  canvas.addEventListener("pointerdown",onDown);
  canvas.addEventListener("pointermove",onMove);
  canvas.addEventListener("pointerup",onUp);
  canvas.addEventListener("pointercancel",onUp);
  const onKey=e=>{
    // Keyboard orbit is available when the canvas has focus.
    if(document.activeElement!==canvas)return;
    if(e.key==="ArrowLeft"){orbitAngle-=.14;e.preventDefault();}
    if(e.key==="ArrowRight"){orbitAngle+=.14;e.preventDefault();}
    if(e.key==="ArrowUp"){orbitTilt=clamp(orbitTilt+.1,-.24,.75);e.preventDefault();}
    if(e.key==="ArrowDown"){orbitTilt=clamp(orbitTilt-.1,-.24,.75);e.preventDefault();}
  };
  canvas.tabIndex=0;
  canvas.addEventListener("keydown",onKey);
  const onContextLost=e=>{e.preventDefault();visible=false;};
  canvas.addEventListener("webglcontextlost",onContextLost);

  const drawMesh=(mesh,model)=>{
    gl.uniformMatrix4fv(uniform.model,false,model);
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    const stride=9*4;
    for(const [attrLocation,offset] of [[attr.pos,0],[attr.normal,3*4],[attr.color,6*4]]){
      gl.enableVertexAttribArray(attrLocation);
      gl.vertexAttribPointer(attrLocation,3,gl.FLOAT,false,stride,offset);
    }
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  };
  const render=(timestamp)=>{
    raf=requestAnimationFrame(render);
    if(!visible || document.hidden)return;
    const dt=Math.min((timestamp-previousTime)||16,45)/1000;
    previousTime=timestamp;
    if(userMotion)animationTick+=dt;
    // Scroll has three cinematic views: front quarter, side profile, rear quarter.
    const targetAngle=.63+scrollProgress*3.12+orbitAngle;
    const targetTilt=.23+Math.sin(scrollProgress*Math.PI)*.12+orbitTilt;
    const s=reducedMotion||!userMotion ? 1 : 1-Math.exp(-dt*4.0);
    angle=lerp(angle,targetAngle,s);
    tilt=lerp(tilt,targetTilt,s);
    resize();
    const mobile=w/h<.85;
    const distance=mobile?8.2:6.95;
    const ey=[Math.sin(angle)*Math.cos(tilt)*distance,
      1.05+Math.sin(tilt)*distance,
      Math.cos(angle)*Math.cos(tilt)*distance];
    const target=[0,.68,0];
    const view=mat4.lookAt(ey,target);
    const projection=mat4.perspective((mobile?47:44)*Math.PI/180,w/h,.1,95);
    projection[8]=mobile?0:-.42;
    const vp=mat4.multiply(projection,view);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(uniform.vp,false,vp);
    gl.uniform3fv(uniform.eye,ey);
    drawMesh(ground,mat4.identity());
    const idle=userMotion?Math.sin(animationTick*1.35)*.012:0;
    const carModel=mat4.rotateY(idle);
    drawMesh(car,carModel);
  };
  raf=requestAnimationFrame(render);
  return {
    setProgress(p){scrollProgress=clamp(p,0,1);},
    reset(){orbitAngle=0;orbitTilt=0;},
    setMotion(allowed){userMotion=!!allowed&&!reducedMotion;},
    setVisible(v){visible=!!v;},
    destroy(){
      cancelAnimationFrame(raf);ro.disconnect();
      canvas.removeEventListener("pointerdown",onDown);
      canvas.removeEventListener("pointermove",onMove);
      canvas.removeEventListener("pointerup",onUp);
      canvas.removeEventListener("pointercancel",onUp);
      canvas.removeEventListener("keydown",onKey);
      canvas.removeEventListener("webglcontextlost",onContextLost);
      gl.deleteBuffer(car.buffer);gl.deleteBuffer(ground.buffer);
      gl.deleteProgram(program);
    }
  };
}
