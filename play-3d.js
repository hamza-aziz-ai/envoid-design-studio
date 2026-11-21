// Shared 3D viewer for the play tools.
//
// Each tool keeps its 2D version as the default and the fallback, and adds a
// "View in 3D" button. Pressing it fetches three.js (vendored, 0.187.0) and the
// textures, builds a viewer in the tool's panel, and hands it back so the tool
// can draw its own state and keep the view in sync as the visitor plays.
// Nothing here loads until that button is pressed. Feet throughout: x east, y up,
// and z = the tools' plan y.
const Play3D = (() => {
  const THREE_URL = '/vendor/three-0.187.0/three.min.js';

  const webgl = () => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  };

  const create = (T, view, opts) => {
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 1.2;
    renderer.outputColorSpace = T.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.label || '3D view');
    view.textContent = '';
    view.append(canvas);

    const scene = new T.Scene();
    scene.background = new T.Color(opts.background || '#ece7df');
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 600);
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.listenToKeyEvents(canvas);

    // Render on demand, and keep going only while the damping settles.
    const hooks = [];
    let queued = false;
    const frame = () => {
      queued = false;
      const moving = controls.update();
      hooks.forEach((h) => h(camera));
      renderer.render(scene, camera);
      if (moving) request();
    };
    const request = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(frame);
      }
    };
    controls.addEventListener('change', request);

    const hemi = new T.HemisphereLight('#f6f2ea', '#9c8f7a', opts.hemi == null ? 1.1 : opts.hemi);
    scene.add(hemi);
    const sun = new T.DirectionalLight('#fff4e2', opts.sun == null ? 2.6 : opts.sun);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 2.5;
    scene.add(sun, sun.target);

    // Photographic materials (CC0, Poly Haven), cached by texture and repeat.
    const loader = new T.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const cache = {};
    const tex = (name, rx, ry, colour) => {
      const key = `${name}|${rx.toFixed(3)}|${ry.toFixed(3)}`;
      if (cache[key]) return cache[key];
      const t = loader.load(`/assets/textures/${name}.jpg`, request);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = aniso;
      if (colour) t.colorSpace = T.SRGBColorSpace;
      return (cache[key] = t);
    };
    const maps = (id, rx, ry) => ({ map: tex(`${id}_diff`, rx, ry, true), normalMap: tex(`${id}_nor`, rx, ry), roughnessMap: tex(`${id}_rough`, rx, ry) });

    // A drawn tile grid: one tile per `w` by `d` feet when the geometry's UVs are in feet.
    const tileCache = {};
    const tiles = (w, d, colour) => {
      const key = `${w}x${d}|${colour}`;
      if (tileCache[key]) return tileCache[key];
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = Math.round((256 * d) / w);
      const g = c.getContext('2d');
      g.fillStyle = '#f4f4f4';
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 400; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
        g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
      }
      g.strokeStyle = '#b5b5b5';
      g.lineWidth = 4;
      g.strokeRect(0, 0, c.width, c.height);
      const t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(1 / w, 1 / d);
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = aniso;
      return (tileCache[key] = new T.MeshStandardMaterial({ map: t, color: colour || '#e6e0d4', roughness: 0.4 }));
    };

    const mat = {
      wood: (rx = 1, ry = 1, tint = '#ffffff') => new T.MeshStandardMaterial({ ...maps('wood_floor', rx, ry), color: tint }),
      plaster: (colour = '#e8e0d2', rx = 1, ry = 1) => new T.MeshStandardMaterial({ ...maps('white_plaster_02', rx, ry), color: colour }),
      fabric: (colour = '#cbbb9e', r = 1) => new T.MeshStandardMaterial({ ...maps('rough_linen', r, r), color: colour }),
      wool: (colour = '#cbbb9e', r = 1) => new T.MeshStandardMaterial({ ...maps('poly_wool_herringbone', r, r), color: colour }),
      marble: (rx = 1, ry = 1, tint = '#ffffff') => new T.MeshStandardMaterial({ ...maps('marble_01', rx, ry), color: tint, roughness: 0.6 }),
      terrazzo: (rx = 1, ry = 1) => new T.MeshStandardMaterial({ ...maps('terrazzo_tiles', rx, ry) }),
      metal: (colour = '#ab8b4e') => new T.MeshStandardMaterial({ color: colour, metalness: 1, roughness: 0.35 }),
      plain: (colour = '#e8e0d2', roughness = 0.85) => new T.MeshStandardMaterial({ color: colour, roughness }),
      tiles,
    };

    // Geometry helpers.
    const box = (x0, y0, z0, x1, y1, z1, material, o = {}) => {
      const sx = Math.max(0.001, x1 - x0), sy = Math.max(0.001, y1 - y0), sz = Math.max(0.001, z1 - z0);
      const r = o.round ? Math.min(o.round, sx / 2.2, sy / 2.2, sz / 2.2) : 0;
      const geo = r > 0.005 ? new T.RoundedBoxGeometry(sx, sy, sz, 3, r) : new T.BoxGeometry(sx, sy, sz);
      const m = new T.Mesh(geo, material);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.castShadow = o.cast !== false;
      m.receiveShadow = true;
      (o.parent || scene).add(m);
      return m;
    };
    const group = () => {
      const g = new T.Group();
      scene.add(g);
      return g;
    };
    // Materials are shared between rebuilds, so only geometry is thrown away.
    const clear = (g) => {
      g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      g.clear();
      cuts.length = 0;
    };

    // Cutaway: walls between the camera and the room are hidden for the view.
    const cuts = [];
    const cutaway = (mesh, nx, nz, px, pz) => cuts.push({ mesh, nx, nz, px, pz });
    hooks.push((cam) => {
      cuts.forEach((c) => { c.mesh.visible = (cam.position.x - c.px) * c.nx + (cam.position.z - c.pz) * c.nz <= 0; });
    });

    // A room from a plan outline: floor shaped to the outline, a wall on every edge.
    const extrudeRoom = (g, pts, o = {}) => {
      const height = o.height || 9, thick = o.thick || 0.4;
      const shape = new T.Shape(pts.map(([x, z]) => new T.Vector2(x, -z)));
      const floor = new T.Mesh(new T.ShapeGeometry(shape), o.floor || mat.plain('#d9cfbf'));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      g.add(floor);
      let s = 0;
      pts.forEach(([x1, z1], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; s += x1 * z2 - x2 * z1; });
      const sign = s > 0 ? 1 : -1;
      pts.forEach(([x1, z1], i) => {
        const [x2, z2] = pts[(i + 1) % pts.length];
        const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
        if (len < 0.01) return;
        const nx = (sign * dz) / len, nz = (-sign * dx) / len; // outward
        const wall = new T.Mesh(new T.BoxGeometry(len + thick, height, thick), o.wall || mat.plaster());
        wall.position.set((x1 + x2) / 2 + (nx * thick) / 2, height / 2, (z1 + z2) / 2 + (nz * thick) / 2);
        wall.rotation.y = -Math.atan2(dz, dx);
        wall.castShadow = true;
        wall.receiveShadow = true;
        g.add(wall);
        cutaway(wall, nx, nz, (x1 + x2) / 2, (z1 + z2) / 2);
      });
      return floor;
    };

    // Point the camera at something of a given size, and fit the sun's shadow to it.
    const frameOn = (cx, cy, cz, radius, o = {}) => {
      const az = o.azimuth == null ? 0.75 : o.azimuth, el = o.elevation == null ? 0.72 : o.elevation, dist = radius * (o.distance || 3.1);
      camera.position.set(cx + dist * Math.cos(el) * Math.cos(az), cy + dist * Math.sin(el), cz + dist * Math.cos(el) * Math.sin(az));
      controls.target.set(cx, cy, cz);
      controls.minDistance = radius * 0.4;
      controls.maxDistance = radius * 6;
      fitSun(cx, cz, radius);
      request();
    };
    const fitSun = (cx, cz, radius, dir) => {
      const d = dir || [0.55, 0.78, 0.3]; // from the camera's side, so the walls in view are lit
      const r = radius * 1.5;
      Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: radius * 12 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(cx, 0, cz);
      sun.position.set(cx + d[0] * radius * 5, d[1] * radius * 5, cz + d[2] * radius * 5);
      request();
    };

    const resize = () => {
      const w = view.clientWidth, h = view.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      request();
    };
    new ResizeObserver(resize).observe(view);
    resize();

    const save = (name) => {
      renderer.render(scene, camera);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    };

    return { THREE: T, renderer, scene, camera, controls, canvas, hemi, sun, request, onFrame: (fn) => hooks.push(fn), mat, box, group, clear, cutaway, extrudeRoom, frameOn, fitSun, save, label: (text) => canvas.setAttribute('aria-label', text) };
  };

  // Wire a tool's button to build its viewer on demand.
  const mount = ({ button, view, status, onReady, ...opts }) => {
    if (!button || !view) return;
    const say = (msg) => { if (status) status.textContent = msg; };
    button.addEventListener('click', async () => {
      button.disabled = true;
      if (!webgl()) {
        say('This browser cannot show 3D graphics, so the drawing above stays as it is.');
        return;
      }
      say('Loading 3D…');
      try {
        const T = await import(THREE_URL);
        view.hidden = false;
        const api = create(T, view, opts);
        button.hidden = true;
        onReady(api);
        say('Drag to turn, scroll or pinch to zoom.');
      } catch {
        say('The 3D view could not load. Check your connection and try again.');
        button.disabled = false;
      }
    });
  };

  return { mount };
})();
