// The 3D room: the sunlight explorer and the finishes playground in one
// real-time scene. The sun is placed with the same NOAA maths as /sun-path/
// (SunPath, from sun-path.js, loaded before this file), and casts real shadows
// through the window. After dark a pendant lamp takes over.
//
// Nothing heavy loads with the page. three.js (vendored, 0.187.0) and the
// textures are fetched only when the visitor presses "Enter the room", so the
// page stays fast for everyone who only reads it. Feet throughout.
// The one piece of maths specific to this page, kept free of it so
// tools/test-tools.js can check it: the sun's direction in room coordinates.
// The window is in the x = 0 wall, so it faces -x; to its right, looking out,
// is -z. `facing` is the compass bearing the window faces.
const Room3D = {
  sunInRoom(sun, facing) {
    const rel = ((sun.az - facing) * Math.PI) / 180; // bearing of the sun, clockwise from the way the window faces
    const alt = (sun.alt * Math.PI) / 180;
    return [-Math.cos(rel) * Math.cos(alt), Math.sin(alt), -Math.sin(rel) * Math.cos(alt)];
  },
};
if (typeof module === 'object' && module.exports) module.exports = Room3D;

(() => {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('r3');
  if (!root || typeof SunPath === 'undefined') return;

  const $ = (id) => document.getElementById(id);
  const { dayOfYear, sunAt, dayTimes } = SunPath;
  const THREE_URL = '/vendor/three-0.187.0/three.min.js';
  const W = 14, D = 12, H = 10, T = 0.4; // room and wall thickness
  const WIN = { z0: 3.5, z1: 8.5, sill: 3, head: 7.5 }; // window in the left wall, x = 0

  // ---- finishes -------------------------------------------------------------
  const F = {
    ivory: ['Warm ivory paint', '#e8e0d2'], charcoal: ['Charcoal paint', '#3e4445'], green: ['Deep green paint', '#34574b'],
    terracotta: ['Terracotta paint', '#b87660'], sage: ['Soft sage paint', '#a5b09a'],
    ivoryTile: ['Ivory porcelain tile', '#dfd9cc'], greyTile: ['Grey porcelain tile', '#8f9391'], terrazzo: ['Terrazzo', '#cdc5b5'],
    marble: ['White veined marble', '#ece9e1'], darkStone: ['Dark stone', '#494c4b'], oak: ['Warm oak', '#ae8052'], walnut: ['Dark walnut', '#604332'],
    linen: ['Beige linen', '#cbbb9e'], greenFabric: ['Deep green fabric', '#355a4a'], blue: ['Blue fabric', '#526a83'], clay: ['Clay fabric', '#ae7566'],
  };
  const GROUPS = {
    walls: { label: 'Walls', options: ['ivory', 'sage', 'terracotta', 'green', 'charcoal'], value: 'ivory' },
    feature: { label: 'Feature wall', options: ['ivory', 'sage', 'terracotta', 'green', 'charcoal', 'oak', 'walnut', 'marble'], value: 'oak' },
    floor: { label: 'Floor', options: ['ivoryTile', 'greyTile', 'terrazzo', 'marble', 'darkStone', 'oak', 'walnut'], value: 'oak' },
    sofa: { label: 'Sofa', options: ['linen', 'greenFabric', 'blue', 'clay'], value: 'greenFabric' },
    rug: { label: 'Rug', options: ['linen', 'greenFabric', 'blue', 'clay'], value: 'linen' },
  };

  // Finishes can arrive in the address from /colour-your-room/. Only values this
  // room offers are taken; anything else keeps the default.
  const params = new URLSearchParams(location.search);
  Object.entries(GROUPS).forEach(([key, g]) => {
    const v = params.get(key);
    if (v && g.options.includes(v)) g.value = v;
  });

  const panel = $('r3-finishes');
  Object.entries(GROUPS).forEach(([key, g]) => {
    const fs = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = g.label;
    const row = document.createElement('div');
    row.className = 'cr__row';
    g.options.forEach((id) => {
      const label = document.createElement('label');
      label.className = 'cr__swatch';
      label.title = F[id][0];
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `r3-${key}`;
      input.value = id;
      input.checked = id === g.value;
      input.setAttribute('aria-label', F[id][0]);
      const chip = document.createElement('span');
      chip.style.background = F[id][1];
      label.append(input, chip);
      row.append(label);
    });
    fs.append(legend, row);
    panel.append(fs);
  });

  // ---- time and place -------------------------------------------------------
  const dateIn = $('r3-date'), timeIn = $('r3-time'), faceIn = $('r3-face');
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  dateIn.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const doyNow = () => {
    const [y, m, d] = dateIn.value.split('-').map(Number);
    return y && m && d ? dayOfYear(y, m, d) : dayOfYear(today.getFullYear(), today.getMonth() + 1, today.getDate());
  };
  const clock = (m) => `${pad(Math.floor(Math.round(m) / 60))}:${pad(Math.round(m) % 60)}`;
  const compass = (az) => ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'][Math.round(az / 22.5) % 16];

  const sunInRoom = (sun) => Room3D.sunInRoom(sun, +faceIn.value);

  // Facts that need no 3D, so they work before (and without) the room loading.
  let scene3d = null;
  const update = () => {
    const doy = doyNow(), minutes = +timeIn.value;
    const sun = sunAt(doy, minutes), t = dayTimes(doy);
    $('r3-time-out').textContent = clock(minutes);
    $('r3-rise').textContent = clock(t.rise);
    $('r3-set').textContent = clock(t.set);
    $('r3-alt').textContent = sun.alt > 0 ? `${sun.alt.toFixed(0)}° above the horizon` : 'Below the horizon';
    $('r3-az').textContent = sun.alt > 0 ? `${sun.az.toFixed(0)}°, ${compass(sun.az)}` : '–';
    const d = sunInRoom(sun);
    const face = faceIn.options[faceIn.selectedIndex].text.toLowerCase();
    const inside = sun.alt > 0.5 && d[0] < 0;
    $('r3-light').textContent = sun.alt <= 0 ? 'Lamplight' : inside ? `Direct sun through the ${face}-facing window` : 'Daylight from the sky only';
    if (scene3d) scene3d.apply(sun, d);
  };

  // ---- the 3D scene ---------------------------------------------------------
  const build = (THREE) => {
    const view = $('r3-view');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoftShadowMap was removed in r18x; radius below softens edges
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.tabIndex = 0;
    view.append(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.3, 300);
    const controls = new THREE.OrbitControls(camera, canvas);
    controls.target.set(W / 2, 3.2, D / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 48;
    controls.maxPolarAngle = Math.PI * 0.49; // never below the floor
    controls.listenToKeyEvents(canvas);

    // Render only when something changed, and keep going while damping settles.
    let queued = false;
    const frame = () => {
      queued = false;
      const moving = controls.update();
      cutaway();
      renderer.render(scene, camera);
      if (moving) request();
    };
    const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    controls.addEventListener('change', request);

    // Textures: photographs (CC0, Poly Haven) with normal and roughness maps.
    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const cache = {};
    const texture = (name, rx, ry, colour, rotate) => {
      const key = `${name}|${rx}|${ry}|${rotate ? 1 : 0}`;
      if (cache[key]) return cache[key];
      const t = loader.load(`/assets/textures/${name}.jpg`, request);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = maxAniso;
      if (rotate) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
      if (colour) t.colorSpace = THREE.SRGBColorSpace;
      return (cache[key] = t);
    };
    const maps = (id, rx, ry, rotate) => ({
      map: texture(`${id}_diff`, rx, ry, true, rotate),
      normalMap: texture(`${id}_nor`, rx, ry, false, rotate),
      roughnessMap: texture(`${id}_rough`, rx, ry, false, rotate),
    });

    // Porcelain tiles are a clean grid, so they are drawn rather than photographed.
    const tileTexture = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = '#f4f4f4';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
      }
      g.strokeStyle = '#bdbdbd';
      g.lineWidth = 6;
      g.strokeRect(0, 0, 512, 512);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(W / 2, D / 2); // 2 ft tiles
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      return t;
    })();

    const surface = (choice, w, h, vertical) => {
      const c = new THREE.Color(F[choice][1]);
      switch (choice) {
        case 'oak': return { ...maps('wood_floor', w / 6, h / 6, vertical), color: new THREE.Color('#ffffff'), roughness: 1, metalness: 0 };
        case 'walnut': return { ...maps('wood_floor', w / 6, h / 6, vertical), color: new THREE.Color('#8a6a55'), roughness: 1, metalness: 0 };
        case 'marble': return { ...maps('marble_01', w / 5, h / 5), color: new THREE.Color('#ffffff'), roughness: 0.6, metalness: 0 };
        case 'darkStone': return { ...maps('marble_01', w / 5, h / 5), color: new THREE.Color('#5d605f'), roughness: 0.7, metalness: 0 };
        case 'terrazzo': return { ...maps('terrazzo_tiles', w / 4, h / 4), color: new THREE.Color('#ffffff'), roughness: 1, metalness: 0 };
        case 'ivoryTile': case 'greyTile': return { map: tileTexture, normalMap: null, roughnessMap: null, color: c, roughness: 0.35, metalness: 0 };
        default: return { ...maps('white_plaster_02', w / 6, h / 6), color: c, roughness: 1, metalness: 0 }; // paints
      }
    };
    const setMaterial = (mat, props) => { Object.assign(mat, props); mat.needsUpdate = true; };

    const floorMat = new THREE.MeshStandardMaterial();
    const wallMat = new THREE.MeshStandardMaterial();
    const featureMat = new THREE.MeshStandardMaterial();
    const sofaMat = new THREE.MeshStandardMaterial();
    const rugMat = new THREE.MeshStandardMaterial();
    const woodMat = new THREE.MeshStandardMaterial({ ...maps('wood_floor', 0.6, 0.6), color: new THREE.Color('#f2e2cf') });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#ab8b4e', metalness: 1, roughness: 0.32 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#2b2f31', metalness: 0.6, roughness: 0.45 });
    const canvasMat = new THREE.MeshStandardMaterial({ color: '#efe8dc', roughness: 0.9 });
    // A wall lifted off for the view still has to block the sun: this material
    // draws nothing but keeps the mesh in the shadow pass.
    const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

    const applyFinishes = () => {
      setMaterial(floorMat, surface(GROUPS.floor.value, W, D));
      setMaterial(wallMat, surface(GROUPS.walls.value, D, H));
      setMaterial(featureMat, surface(GROUPS.feature.value, W, H, true));
      const fabric = (id, r) => ({ ...maps(id === 'rug' ? 'poly_wool_herringbone' : 'rough_linen', r, r), roughness: 1, metalness: 0 });
      setMaterial(sofaMat, { ...fabric('sofa', 1.6), color: new THREE.Color(F[GROUPS.sofa.value][1]) });
      setMaterial(rugMat, { ...fabric('rug', 3), color: new THREE.Color(F[GROUPS.rug.value][1]) });
      request();
    };

    const box = (x0, y0, z0, x1, y1, z1, mat, opts = {}) => {
      const geo = opts.round
        ? new THREE.RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 4, opts.round)
        : new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      m.castShadow = opts.cast !== false;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    // Floor, and ground outside the window so the view out is not a void.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(W / 2, 0, D / 2);
    floor.receiveShadow = true;
    scene.add(floor);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#b9b3a6', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, -0.05, D / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // Walls. Each side remembers its own material so it can be lifted away.
    const sides = [];
    const side = (meshes, outside) => { meshes.forEach((m) => { m.userData.mat = m.material; }); sides.push({ meshes, outside }); };
    side([
      box(-T, 0, -T, 0, WIN.sill, D + T, wallMat),
      box(-T, WIN.head, -T, 0, H, D + T, wallMat),
      box(-T, WIN.sill, -T, 0, WIN.head, WIN.z0, wallMat),
      box(-T, WIN.sill, WIN.z1, 0, WIN.head, D + T, wallMat),
    ], (c) => c.x < 0);
    side([box(W, 0, -T, W + T, H, D + T, wallMat)], (c) => c.x > W);
    side([box(-T, 0, -T, W + T, H, 0, featureMat)], (c) => c.z < 0);
    side([box(-T, 0, D, W + T, H, D + T, wallMat)], (c) => c.z > D);
    side([box(-T, H, -T, W + T, H + T, D + T, wallMat)], (c) => c.y > H);
    // Skirting, lifted away with the wall it runs along.
    sides[2].meshes.push(Object.assign(box(0, 0, 0, W, 0.35, 0.06, darkMat, { cast: false }), { userData: { mat: darkMat } }));
    sides[0].meshes.push(Object.assign(box(0, 0, 0, 0.06, 0.35, D, darkMat, { cast: false }), { userData: { mat: darkMat } }));

    // Window: frame, mullion and glass that lets the light through.
    const fr = 0.14;
    [
      box(-T, WIN.sill - fr, WIN.z0 - fr, 0.02, WIN.sill, WIN.z1 + fr, darkMat),
      box(-T, WIN.head, WIN.z0 - fr, 0.02, WIN.head + fr, WIN.z1 + fr, darkMat),
      box(-T, WIN.sill, WIN.z0 - fr, 0.02, WIN.head, WIN.z0, darkMat),
      box(-T, WIN.sill, WIN.z1, 0.02, WIN.head, WIN.z1 + fr, darkMat),
      box(-T, WIN.sill, (WIN.z0 + WIN.z1) / 2 - fr / 2, 0.02, WIN.head, (WIN.z0 + WIN.z1) / 2 + fr / 2, darkMat),
    ].forEach((m) => sides[0].meshes.push(Object.assign(m, { userData: { mat: darkMat } })));
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(WIN.z1 - WIN.z0, WIN.head - WIN.sill),
      new THREE.MeshStandardMaterial({ color: '#cfe3ee', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0 }),
    );
    glass.rotation.y = Math.PI / 2;
    glass.position.set(-T / 2, (WIN.sill + WIN.head) / 2, (WIN.z0 + WIN.z1) / 2);
    scene.add(glass);

    // Art on the feature wall.
    box(1.6, 4.4, 0, 5.0, 7.4, 0.12, darkMat);
    box(1.75, 4.55, 0.12, 4.85, 7.25, 0.14, canvasMat, { cast: false });

    // Rug, sofa, coffee table.
    box(2.2, 0, 3.8, 12, 0.05, 10.2, rugMat, { cast: false });
    box(3, 0.45, 0.4, 11, 1.55, 3.3, sofaMat, { round: 0.18 });
    box(3, 1.4, 0.4, 11, 3.0, 1.25, sofaMat, { round: 0.2 });
    box(2.35, 0.45, 0.4, 3.05, 2.3, 3.3, sofaMat, { round: 0.18 });
    box(10.95, 0.45, 0.4, 11.65, 2.3, 3.3, sofaMat, { round: 0.18 });
    box(3.2, 1.5, 1.2, 6.95, 1.85, 3.2, sofaMat, { round: 0.16 });
    box(7.05, 1.5, 1.2, 10.8, 1.85, 3.2, sofaMat, { round: 0.16 });
    [[2.6, 0.7], [11.4, 0.7], [2.6, 3.0], [11.4, 3.0]].forEach(([x, z]) => box(x - 0.08, 0, z - 0.08, x + 0.08, 0.45, z + 0.08, metalMat, { cast: false }));
    box(5.3, 1.2, 5.0, 8.7, 1.42, 7.2, woodMat, { round: 0.05 });
    [[5.55, 5.25], [8.45, 5.25], [5.55, 6.95], [8.45, 6.95]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), metalMat);
      leg.position.set(x, 0.6, z);
      leg.castShadow = true;
      scene.add(leg);
    });

    // Pendant lamp over the table.
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H - 7.3, 6), darkMat);
    cord.position.set(7, (H + 7.3) / 2, 6.1);
    scene.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.85, 40, 1, true), metalMat);
    shade.material = metalMat.clone();
    shade.material.side = THREE.DoubleSide;
    shade.position.set(7, 6.9, 6.1);
    shade.castShadow = true;
    scene.add(shade);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffd59a', emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12), bulbMat);
    bulb.position.set(7, 6.55, 6.1);
    scene.add(bulb);
    const lamp = new THREE.PointLight('#ffcf8f', 0, 0, 2);
    lamp.position.set(7, 6.3, 6.1);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.002;
    scene.add(lamp);

    // Sky light, bounce and the sun.
    const hemi = new THREE.HemisphereLight('#cfe2f3', '#8a7b66', 1);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight('#ffffff', 0.15);
    scene.add(ambient);
    const sunLight = new THREE.DirectionalLight('#fff3df', 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunLight.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.03;
    sunLight.shadow.radius = 2.5;
    sunLight.target.position.set(W / 2, 0, D / 2);
    scene.add(sunLight, sunLight.target);
    // Bounce: real rooms are lit mostly by sun reflected off the floor patch, which
    // this renderer does not trace. A soft warm light rising from where the sun
    // actually lands stands in for it.
    const bounce = new THREE.PointLight('#ffe2bf', 0, 0, 2);
    scene.add(bounce);

    const NIGHT = new THREE.Color('#0d1322'), DUSK = new THREE.Color('#e7a473'), DAY = new THREE.Color('#a9cbe6');
    const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

    // Lift away whichever walls stand between the camera and the room.
    const cutaway = () => {
      const c = camera.position;
      sides.forEach((s) => {
        const away = s.outside(c);
        s.meshes.forEach((m) => { m.material = away ? shadowOnly : m.userData.mat; });
      });
    };

    const apply = (sun, d) => {
      const alt = sun.alt;
      const day = Math.max(0, Math.min(1, (alt + 2) / 10)); // 0 at night, 1 once the sun is 8° up
      const sky = alt < -6 ? NIGHT.clone() : alt < 4 ? NIGHT.clone().lerp(DUSK, (alt + 6) / 10) : DUSK.clone().lerp(DAY, Math.min(1, (alt - 4) / 16));
      scene.background = sky;
      hemi.color.copy(sky).lerp(new THREE.Color('#ffffff'), 0.35);
      // Sky fill is not blocked by walls in this renderer, so it stays low and the
      // sun through the window carries the room, as it does in a real one.
      hemi.intensity = lerp(0.08, 0.8, day);
      ambient.intensity = lerp(0.04, 0.1, day);
      bounce.intensity = 0;
      if (alt > 0) {
        sunLight.position.set(W / 2 + d[0] * 60, d[1] * 60, D / 2 + d[2] * 60);
        if (d[0] < 0 && d[1] > 0.02) {
          // Where light through the middle of the window meets the floor.
          const wy = (WIN.sill + WIN.head) / 2, wz = (WIN.z0 + WIN.z1) / 2, t = wy / d[1];
          const bx = Math.min(W - 0.5, Math.max(0.5, -d[0] * t)), bz = Math.min(D - 0.5, Math.max(0.5, wz - d[2] * t));
          bounce.position.set(bx, 3, bz); // up off the floor, so it fills rather than spotlights
          bounce.intensity = lerp(0, 16, Math.min(1, alt / 12));
        }
        sunLight.intensity = lerp(0, 7, Math.min(1, alt / 12));
        sunLight.color.set(alt < 10 ? '#ffc58a' : '#fff3df');
      } else {
        sunLight.intensity = 0;
      }
      const lampOn = $('r3-lamp').checked;
      lamp.intensity = lampOn ? 26 : 0;
      bulbMat.emissiveIntensity = lampOn ? 2.2 : 0;
      glass.material.opacity = alt > 0 ? 0.12 : 0.35;
      renderer.toneMappingExposure = lerp(1.5, 1.25, day);
      canvas.setAttribute('aria-label', `A living room seen in 3D at ${$('r3-time-out').textContent}. ${$('r3-light').textContent}. ${Object.values(GROUPS).map((g) => `${g.label}: ${F[g.value][0]}`).join('. ')}.`);
      request();
    };

    // Camera positions.
    const views = {
      overview: { pos: [W + 11, 15, D + 12], target: [W / 2, 3.2, D / 2] },
      eye: { pos: [W - 1.6, 5.2, D - 1.4], target: [3.5, 3.6, 4.5] },
      window: { pos: [W - 2, 5.4, 6], target: [0, 4.6, 6] },
    };
    const go = (name) => {
      const v = views[name];
      camera.position.set(...v.pos);
      controls.target.set(...v.target);
      request();
    };

    const resize = () => {
      const w = view.clientWidth, h = view.clientHeight; // the stage's CSS sets the shape
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      request();
    };
    new ResizeObserver(resize).observe(view);

    go('overview');
    applyFinishes();
    resize();

    return {
      apply: (sun, d) => apply(sun, d),
      finishes: applyFinishes,
      view: go,
      turn: (deg) => {
        const off = camera.position.clone().sub(controls.target);
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (deg * Math.PI) / 180);
        camera.position.copy(controls.target).add(off);
        request();
      },
      save: () => {
        renderer.render(scene, camera);
        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'my-3d-room-envoid.png';
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, 'image/png');
      },
    };
  };

  // ---- wiring ---------------------------------------------------------------
  const status = (msg) => { $('r3-status').textContent = msg; };
  const start = $('r3-start');
  start.addEventListener('click', async () => {
    start.disabled = true;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
      status('This browser cannot show 3D graphics. The sunlight explorer and colour your room pages show the same ideas without it.');
      start.disabled = false;
      return;
    }
    status('Loading the room…');
    try {
      const THREE = await import(THREE_URL);
      scene3d = build(THREE);
      $('r3-poster').hidden = true;
      root.classList.add('is-live');
      root.querySelectorAll('[data-needs-3d]').forEach((b) => { b.disabled = false; });
      status('Drag to look around, scroll or pinch to zoom. Change the time, date or window to move the sun.');
      update();
    } catch {
      status('The 3D room could not load. Check your connection and try again.');
      start.disabled = false;
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.name && e.target.name.startsWith('r3-')) {
      GROUPS[e.target.name.slice(3)].value = e.target.value;
      if (scene3d) scene3d.finishes();
      update();
      return;
    }
    update();
  });
  $('r3-lamp').addEventListener('change', update);
  document.querySelectorAll('[data-r3-date]').forEach((b) => b.addEventListener('click', () => {
    dateIn.value = `${today.getFullYear()}-${b.dataset.r3Date}`;
    update();
  }));
  document.querySelectorAll('[data-r3-view]').forEach((b) => b.addEventListener('click', () => scene3d && scene3d.view(b.dataset.r3View)));
  $('r3-left').addEventListener('click', () => scene3d && scene3d.turn(-30));
  $('r3-right').addEventListener('click', () => scene3d && scene3d.turn(30));
  $('r3-save').addEventListener('click', () => scene3d && scene3d.save());

  // Lamp follows the sun unless the visitor sets it by hand.
  let lampTouched = false;
  $('r3-lamp').addEventListener('click', () => { lampTouched = true; });
  const autoLamp = () => {
    if (lampTouched) return;
    $('r3-lamp').checked = sunAt(doyNow(), +timeIn.value).alt < 3;
  };
  root.addEventListener('input', autoLamp, true);

  // Play the day, sunrise to sunset. Only ever started by the visitor.
  const play = $('r3-play');
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; play.textContent = 'Play the day'; play.setAttribute('aria-pressed', 'false'); };
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    const { rise, set } = dayTimes(doyNow());
    let m = Math.ceil(rise / 10) * 10;
    play.textContent = 'Pause';
    play.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => {
      if (m > set) { stop(); return; }
      timeIn.value = m;
      autoLamp();
      update();
      m += 6;
    }, 60);
  });

  autoLamp();
  update();
})();
