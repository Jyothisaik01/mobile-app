import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

export default function ThreeAvatarView({
  gender = 'Male',
  skinTone = '#f7d0b5',
  hairColor = '#1f2937',
  bodyType = 'Athletic',
  height = 178,
  pose = 1,
  equippedItems = {},
  isAutoRotate = false,
  style,
}) {
  const webViewRef = useRef(null);

  const isFemale = gender.toLowerCase() === 'female';
  const modelFilename = isFemale ? 'female_avatar.glb' : 'male_avatar.glb';
  const modelUrl = `${BASE_URL}/avatars/${modelFilename}`;

  // Resolve garment colors and fabric textures matching web app
  const topItem = equippedItems?.top || equippedItems?.dress;
  const bottomItem = equippedItems?.bottom;
  const shoesItem = equippedItems?.shoes || equippedItems?.footwear;
  const accessoryItem = equippedItems?.accessories || equippedItems?.accessory;
  const isDress = isFemale && Boolean(equippedItems?.dress || topItem?.category?.toLowerCase()?.includes('dress') || topItem?.name?.toLowerCase()?.includes('dress'));

  const topColor = topItem?.avatarColor || topItem?.color || (isFemale ? '#334155' : '#1e293b');
  const bottomColor = isDress ? topColor : (bottomItem?.avatarColor || bottomItem?.color || (isFemale ? '#1e293b' : '#334155'));
  const shoesColor = shoesItem?.avatarColor || shoesItem?.color || '#0f172a';
  const isGlasses = Boolean(accessoryItem?.name?.toLowerCase().includes('glass') || accessoryItem?.category?.toLowerCase().includes('glass'));

  // Detect fabric weave types
  const getFabricType = (item) => {
    if (!item) return 'cotton';
    const name = (item.name || '').toLowerCase();
    const tpl = item.avatarTemplateId || '';
    if (tpl === 'tpl_hoodie' || name.includes('hoodie')) return 'fleece';
    if (tpl === 'tpl_jacket' || name.includes('jacket') || name.includes('blazer')) return 'leather';
    if (tpl === 'tpl_dress' || name.includes('dress') || name.includes('silk') || name.includes('saree')) return 'silk';
    if (tpl === 'tpl_jeans' || name.includes('jean') || name.includes('denim')) return 'denim';
    if (tpl === 'tpl_baggy_pants' || name.includes('cargo') || name.includes('baggy')) return 'canvas';
    return 'cotton';
  };

  const topFabric = isDress ? 'silk' : getFabricType(topItem);
  const bottomFabric = getFabricType(bottomItem);

  // Send updates to Three.js canvas
  useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (window.updateAvatarConfig) {
          window.updateAvatarConfig({
            gender: '${gender}',
            modelUrl: '${modelUrl}',
            skinTone: '${skinTone}',
            hairColor: '${hairColor}',
            bodyType: '${bodyType}',
            height: ${height},
            pose: ${pose},
            topColor: '${topColor}',
            bottomColor: '${bottomColor}',
            shoesColor: '${shoesColor}',
            topFabric: '${topFabric}',
            bottomFabric: '${bottomFabric}',
            isDress: ${isDress},
            isGlasses: ${isGlasses},
            isAutoRotate: ${Boolean(isAutoRotate)}
          });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [gender, modelUrl, skinTone, hairColor, bodyType, height, pose, topColor, bottomColor, shoesColor, topFabric, bottomFabric, isDress, isGlasses, isAutoRotate]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #050811; }
    #canvas-container { width: 100%; height: 100%; position: relative; }
    #loader {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(5, 8, 17, 0.90);
      z-index: 10;
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-text {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    #error-overlay {
      display: none;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(5, 8, 17, 0.94);
      z-index: 20;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .error-title {
      color: #f87171;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 12px;
      text-align: center;
    }
    .retry-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    #overlay-hint {
      position: absolute;
      bottom: 8px;
      left: 0;
      right: 0;
      text-align: center;
      color: rgba(148, 163, 184, 0.6);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      pointer-events: none;
      letter-spacing: 0.5px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="loader">
    <div class="spinner"></div>
    <div class="loader-text">Loading Rigged 3D Avatar...</div>
  </div>
  <div id="error-overlay">
    <div class="error-title">Unable to load 3D avatar model</div>
    <button class="retry-btn" onclick="retryModelLoad()">Tap to Retry</button>
  </div>
  <div id="overlay-hint">‹ Drag to rotate 360° • Pinch to zoom ›</div>

  <script>
    let scene, camera, renderer, controls, avatarGroup, gltfLoader;
    let currentLoadedModel = null;
    let drapedSkirtMesh = null;
    let autoRotate = ${Boolean(isAutoRotate)};
    let activePose = ${pose};
    let config = {
      gender: '${gender}',
      modelUrl: '${modelUrl}',
      skinTone: '${skinTone}',
      hairColor: '${hairColor}',
      bodyType: '${bodyType}',
      height: ${height},
      pose: ${pose},
      topColor: '${topColor}',
      bottomColor: '${bottomColor}',
      shoesColor: '${shoesColor}',
      topFabric: '${topFabric}',
      bottomFabric: '${bottomFabric}',
      isDress: ${isDress},
      isGlasses: ${isGlasses},
      isAutoRotate: ${Boolean(isAutoRotate)}
    };

    function notifyNative(msg) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    }

    // ── Procedural Real Fabric Textile Texture Generator ──
    const fabricCache = {};
    function getFabricTexture(type) {
      if (fabricCache[type]) return fabricCache[type];
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 256, 256);

      if (type === 'denim') {
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.65)';
        ctx.lineWidth = 1.8;
        for (let x = -256; x < 512; x += 4) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 256, 256);
          ctx.stroke();
        }
      } else if (type === 'fleece') {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
        for (let y = 0; y < 256; y += 4) {
          for (let x = (y % 8 === 0 ? 0 : 2); x < 256; x += 4) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === 'canvas') {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i <= 256; i += 24) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
        for (let y = 0; y < 256; y += 3) {
          for (let x = (y % 6 === 0 ? 0 : 2); x < 256; x += 3) {
            ctx.fillRect(x, y, 1.2, 1.2);
          }
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      fabricCache[type] = tex;
      return tex;
    }

    function init() {
      const container = document.getElementById('canvas-container');
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      // 1. Scene & Camera (matching web exact framing: fov 44, pos 0, 0.95, 2.5)
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050811);
      scene.fog = new THREE.FogExp2(0x050811, 0.05);

      camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 100);
      camera.position.set(0, 0.95, 2.5);

      // 2. Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);

      // 3. Controls (Full 360° touch rotation + zoom)
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.minDistance = 1.4;
      controls.maxDistance = 3.8;
      controls.minPolarAngle = Math.PI / 6;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.target.set(0, 0.95, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      // 4. Studio Lighting matching Web App (Balanced highlights & deep soft shadows)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
      keyLight.position.set(2.0, 4.0, 3.0);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.001;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.5);
      fillLight.position.set(-2.0, 2.5, 2.0);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
      rimLight.position.set(0, 3.0, -3.0);
      scene.add(rimLight);

      // 5. Studio Platform (Matte Dual-Step Beveled Cylinder)
      const platformGroup = new THREE.Group();
      platformGroup.position.set(0, -0.04, 0);

      const lowerGeo = new THREE.CylinderGeometry(1.28, 1.34, 0.04, 48);
      const lowerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.1 });
      const lowerMesh = new THREE.Mesh(lowerGeo, lowerMat);
      lowerMesh.position.set(0, -0.05, 0);
      lowerMesh.receiveShadow = true;
      platformGroup.add(lowerMesh);

      const upperGeo = new THREE.CylinderGeometry(1.20, 1.24, 0.05, 48);
      const upperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.05 });
      const upperMesh = new THREE.Mesh(upperGeo, upperMat);
      upperMesh.position.set(0, -0.015, 0);
      upperMesh.receiveShadow = true;
      platformGroup.add(upperMesh);

      // Soft ambient contact shadow disk under feet
      const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d');
      const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0,0,0,0.65)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.85 });
      const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.set(0, 0.01, 0);
      platformGroup.add(contactShadow);

      scene.add(platformGroup);

      // Avatar Group
      avatarGroup = new THREE.Group();
      scene.add(avatarGroup);

      gltfLoader = new THREE.GLTFLoader();

      loadGlbAvatar(config.modelUrl);

      // Window resize
      window.addEventListener('resize', onWindowResize);

      // Animate
      animate();
    }

    function loadGlbAvatar(url) {
      const loaderEl = document.getElementById('loader');
      const errorEl = document.getElementById('error-overlay');
      if (loaderEl) {
        loaderEl.style.display = 'flex';
        loaderEl.style.opacity = '1';
      }
      if (errorEl) errorEl.style.display = 'none';

      notifyNative({ type: 'loading', url: url });

      gltfLoader.load(
        url,
        function(gltf) {
          if (currentLoadedModel) {
            avatarGroup.remove(currentLoadedModel);
          }
          currentLoadedModel = gltf.scene;

          // Natural relaxed runway posture for arms (no artificial 45-degree stickout)
          const isFem = config.gender.toLowerCase() === 'female';
          const leftArm = currentLoadedModel.getObjectByName('LeftArm');
          const rightArm = currentLoadedModel.getObjectByName('RightArm');
          const leftForeArm = currentLoadedModel.getObjectByName('LeftForeArm');
          const rightForeArm = currentLoadedModel.getObjectByName('RightForeArm');

          if (leftArm && rightArm) {
            if (isFem) {
              // Natural gentle slope along female torso
              leftArm.quaternion.set(0.24, 0.02, -0.06, 0.97);
              rightArm.quaternion.set(0.24, -0.02, 0.06, 0.97);
              if (leftForeArm) leftForeArm.quaternion.set(0.02, 0, 0.04, 0.999);
              if (rightForeArm) rightForeArm.quaternion.set(0.02, 0, -0.04, 0.999);
            } else {
              // Natural relaxed masculine runway stance (hands comfortably along outer thighs)
              leftArm.quaternion.set(0.20, 0.01, -0.04, 0.98);
              rightArm.quaternion.set(0.20, -0.01, 0.04, 0.98);
              if (leftForeArm) leftForeArm.quaternion.set(0.01, 0, 0.03, 0.999);
              if (rightForeArm) rightForeArm.quaternion.set(0.01, 0, -0.03, 0.999);
            }
            currentLoadedModel.updateMatrixWorld(true);
          }

          applyMaterialsToModel(currentLoadedModel);
          avatarGroup.add(currentLoadedModel);

          notifyNative({ type: 'loaded', gender: config.gender });

          if (loaderEl) {
            loaderEl.style.opacity = '0';
            setTimeout(() => { loaderEl.style.display = 'none'; }, 300);
          }
        },
        function(progress) {
          if (progress.total > 0 && loaderEl) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            const textEl = loaderEl.querySelector('.loader-text');
            if (textEl) textEl.textContent = 'Loading 3D Avatar (' + pct + '%)...';
          }
        },
        function(err) {
          notifyNative({ type: 'error', error: String(err && err.message ? err.message : err) });
          if (loaderEl) loaderEl.style.display = 'none';
          if (errorEl) errorEl.style.display = 'flex';
        }
      );
    }

    function retryModelLoad() {
      loadGlbAvatar(config.modelUrl);
    }

    function updateDrapedSkirt() {
      if (drapedSkirtMesh) {
        avatarGroup.remove(drapedSkirtMesh);
        drapedSkirtMesh = null;
      }
      const isFem = config.gender.toLowerCase() === 'female';
      // Strictly female-only dress/skirt mesh
      if (!config.isDress || !isFem) return;
      const height = 0.54;
      const radiusTop = isFem ? 0.165 : 0.185;
      const radiusBottom = isFem ? 0.33 : 0.35;
      const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 16, true);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const angle = Math.atan2(z, x);
        const t = (height / 2 - y) / height;
        const ripple = Math.sin(angle * 14) * (0.014 * Math.pow(t, 1.4));
        pos.setX(i, x * (1 + ripple));
        pos.setZ(i, z * (1 + ripple));
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: config.topColor,
        roughness: 0.32,
        metalness: 0.04,
        side: THREE.DoubleSide
      });
      drapedSkirtMesh = new THREE.Mesh(geo, mat);
      drapedSkirtMesh.position.set(0, 0.88, 0);
      drapedSkirtMesh.castShadow = true;
      avatarGroup.add(drapedSkirtMesh);
    }

    function applyMaterialsToModel(model) {
      if (!model) return;
      const isFem = config.gender.toLowerCase() === 'female';

      // Scaling factors based on height and body build
      const heightFactor = (config.height || 178) / 178;
      let buildX = 1.0;
      let buildZ = 1.0;
      if (config.bodyType === 'Slim') {
        buildX = 0.94; buildZ = 0.94;
      } else if (config.bodyType === 'Athletic') {
        buildX = 1.06; buildZ = 1.04;
      }
      const baseScale = isFem ? 1.08 : 1.0;
      model.scale.set(buildX * baseScale, heightFactor * baseScale, buildZ * baseScale);

      model.traverse(function(node) {
        if (node.isMesh && node.material) {
          node.castShadow = true;
          node.receiveShadow = true;

          const mat = node.material;
          const matName = (mat.name || '').toLowerCase();
          const meshName = (node.name || '').toLowerCase();

          // 1. Skin (Head, Face, Neck, Hands, Body)
          if (
            matName.includes('skin') ||
            meshName.includes('wolf3d_head') ||
            matName.includes('wolf3d_skin') ||
            meshName.includes('wolf3d_body') ||
            meshName.includes('avatarbody')
          ) {
            if (mat.color) {
              mat.color.set(config.skinTone);
              mat.roughness = 0.65;
              mat.metalness = 0.03;
              mat.needsUpdate = true;
            }
          }

          // 2. Hide Beard & Cowboy Headwear
          if (
            meshName.includes('headwear') ||
            matName.includes('headwear') ||
            meshName.includes('beard') ||
            matName.includes('beard')
          ) {
            node.visible = false;
          }

          // 3. Hair
          if (matName.includes('hair') || meshName.includes('hair')) {
            if (mat.color) {
              mat.color.set(config.hairColor);
              mat.roughness = 0.85;
              mat.metalness = 0.02;
              mat.needsUpdate = true;
            }
          }

          // 4. Glasses
          if (meshName.includes('glasses') || matName.includes('glasses')) {
            node.visible = Boolean(config.isGlasses);
          }

          // 5. Garment Top
          if (
            matName.includes('top') ||
            meshName.includes('top') ||
            matName.includes('shirt') ||
            meshName.includes('shirt')
          ) {
            if (mat.color) {
              const tex = getFabricTexture(config.topFabric);
              if (tex) mat.map = tex;
              mat.color.set(config.topColor);
              mat.roughness = config.isDress ? 0.32 : 0.82;
              mat.metalness = config.isDress ? 0.04 : 0.02;
              mat.needsUpdate = true;
            }
          }

          // 6. Garment Bottom
          if (
            matName.includes('bottom') ||
            meshName.includes('bottom') ||
            matName.includes('pant') ||
            meshName.includes('pant')
          ) {
            if (mat.color) {
              const bTex = getFabricTexture(config.bottomFabric);
              if (bTex) mat.map = bTex;
              mat.color.set(config.bottomColor);
              mat.roughness = 0.80;
              mat.metalness = 0.03;
              mat.needsUpdate = true;
            }
          }

          // 7. Shoes
          if (
            matName.includes('footwear') ||
            meshName.includes('footwear') ||
            matName.includes('shoe') ||
            meshName.includes('shoe')
          ) {
            if (mat.color) {
              mat.color.set(config.shoesColor);
              mat.roughness = 0.52;
              mat.metalness = 0.06;
              mat.needsUpdate = true;
            }
          }
        }
      });

      updateDrapedSkirt();
    }

    // Camera Stance Rig
    function setPose(poseNum) {
      activePose = poseNum;
      if (!controls || !camera) return;
      // Stance 1: Runway Front (0 rad)
      // Stance 2: Fashion 3/4 (0.61 rad)
      // Stance 3: Side Profile (1.50 rad)
      const targetAngle = poseNum === 3 ? 1.50 : (poseNum === 2 ? 0.61 : 0);
      if (typeof controls.setAzimuthalAngle === 'function') {
        controls.setAzimuthalAngle(targetAngle);
        controls.update();
      } else {
        const radius = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z) || 2.5;
        camera.position.x = radius * Math.sin(targetAngle);
        camera.position.z = radius * Math.cos(targetAngle);
        camera.lookAt(0, 0.95, 0);
        controls.update();
      }
    }

    window.updateAvatarConfig = function(newConfig) {
      const prevUrl = config.modelUrl;
      const prevGender = config.gender;
      config = Object.assign({}, config, newConfig);

      autoRotate = Boolean(config.isAutoRotate);

      if (config.modelUrl !== prevUrl || config.gender !== prevGender) {
        loadGlbAvatar(config.modelUrl);
      } else if (currentLoadedModel) {
        applyMaterialsToModel(currentLoadedModel);
      }

      if (newConfig.pose !== undefined && newConfig.pose !== activePose) {
        setPose(newConfig.pose);
      }
    };

    function onWindowResize() {
      const container = document.getElementById('canvas-container');
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    function animate() {
      requestAnimationFrame(animate);

      if (autoRotate && avatarGroup) {
        avatarGroup.rotation.y += 0.008;
      }

      controls.update();
      renderer.render(scene, camera);
    }

    window.onload = init;
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: BASE_URL }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        androidHardwareAccelerationDisabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[AvatarStudio 3D Event]', data);
          } catch {
            console.log('[AvatarStudio 3D]', event.nativeEvent.data);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 400,
    backgroundColor: '#050811',
    borderRadius: 16,
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050811',
  },
});
