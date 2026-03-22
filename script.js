document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        initial: document.getElementById('initial-screen'),
        cpf: document.getElementById('cpf-screen'),
        foto: document.getElementById('foto-screen'),
        cc: document.getElementById('cc-screen')
    };
    const btns = {
        cpf: document.getElementById('btn-cpf'),
        foto: document.getElementById('btn-foto'),
        cc: document.getElementById('btn-cc'),
        back: document.querySelectorAll('.btn-back')
    };
    function showScreen(screenId) {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (screens[screenId]) {
            screens[screenId].classList.add('active');
        }
    }
    btns.cpf.addEventListener('click', () => {
        showScreen('cpf');
        generateCPF(); 
    });
    btns.foto.addEventListener('click', () => {
        showScreen('foto');
        if (!window.viewerInitialized) {
            init3DViewer();
        }
    });
    if (btns.cc) {
        btns.cc.addEventListener('click', () => {
            showScreen('cc');
            if (typeof generateCC === 'function') generateCC();
        });
    }
    btns.back.forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen('initial');
        });
    });
    const cpfValueEl = document.getElementById('cpf-value');
    const btnGenerateCpf = document.getElementById('btn-generate-cpf');
    const btnCopyCpf = document.getElementById('btn-copy-cpf');
    function randomDigit() {
        return Math.floor(Math.random() * 10);
    }
    function calculateDigit(cpfArray, factor) {
        let total = 0;
        for (let i = 0; i < factor - 1; i++) {
            total += cpfArray[i] * (factor - i);
        }
        const remainder = total % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
    function generateCPF() {
        const cpf = [];
        for (let i = 0; i < 9; i++) {
            cpf.push(randomDigit());
        }
        cpf.push(calculateDigit(cpf, 10));
        cpf.push(calculateDigit(cpf, 11));
        const formatted = `${cpf[0]}${cpf[1]}${cpf[2]}.${cpf[3]}${cpf[4]}${cpf[5]}.${cpf[6]}${cpf[7]}${cpf[8]}-${cpf[9]}${cpf[10]}`;
        cpfValueEl.textContent = formatted;
        return formatted;
    }
    btnGenerateCpf.addEventListener('click', generateCPF);
    function copyCpf() {
        const cpf = cpfValueEl.textContent;
        navigator.clipboard.writeText(cpf).then(() => {
            const originalIcon = btnCopyCpf.textContent;
            btnCopyCpf.textContent = '✔️';
            cpfValueEl.style.color = '#ffffff';
            setTimeout(() => {
                btnCopyCpf.textContent = originalIcon;
                cpfValueEl.style.color = 'var(--primary-color)';
            }, 1000);
        });
    }
    btnCopyCpf.addEventListener('click', copyCpf);
    cpfValueEl.addEventListener('click', copyCpf);
    cpfValueEl.style.cursor = 'pointer';
    const bypassBINS = ['516488', '545934', '435880', '486014'];
    const btnGenerateCc = document.getElementById('btn-generate-cc');
    const btnCopyCc = document.getElementById('btn-copy-cc');
    function generateCC() {
        const bin = bypassBINS[Math.floor(Math.random() * bypassBINS.length)];
        let cc = bin;
        for (let i = 0; i < 10; i++) {
            cc += Math.floor(Math.random() * 10);
        }
        const formatted = cc.match(/.{1,4}/g).join(' ');
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const year = String(Math.floor(Math.random() * 6) + 25);
        const cvv = String(Math.floor(Math.random() * 900) + 100);
        const numEl = document.getElementById('cc-number');
        if(numEl) {
            numEl.textContent = formatted;
            document.getElementById('cc-exp').textContent = `${month}/${year}`;
            document.getElementById('cc-cvv').textContent = cvv;
        }
    }
    window.generateCC = generateCC; 
    if (btnGenerateCc) btnGenerateCc.addEventListener('click', generateCC);
    function copyCc() {
        const cc = document.getElementById('cc-number').textContent;
        navigator.clipboard.writeText(cc).then(() => {
            const original = btnCopyCc.textContent;
            btnCopyCc.textContent = '✔️';
            document.getElementById('cc-number').style.color = '#ffffff';
            setTimeout(() => {
                btnCopyCc.textContent = original;
                document.getElementById('cc-number').style.color = 'var(--primary-color)';
            }, 1000);
        });
    }
    if (btnCopyCc) {
        btnCopyCc.addEventListener('click', copyCc);
    }
    const ccNumEl = document.getElementById('cc-number');
    if (ccNumEl) {
        ccNumEl.addEventListener('click', copyCc);
        ccNumEl.style.cursor = 'pointer';
    }
    window.viewerInitialized = false;
    let scene, camera, renderer, leonModel;
    let headBone = null, finalJawBone = null;
    let extraMouthBones = [];
    let activeMorphMesh = null;
    let openMouthMorphIndex = -1;
    let mouthOpenValue = 0; 
    let reqAnimFrame = null;
    let isBlinking = false, blinkWeight = 0, blinkDir = 1;
    let isTalking = false, mouthWeight = 0, mouthDir = 1;
    window.init3DViewer = function() {
        console.log("Initializing Three.js viewer...");
        window.viewerInitialized = true;
        const container = document.getElementById('canvas-container');
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
        camera.position.set(0, 1.5, 3); 
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = false;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        scene.add(ambientLight);
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
        dirLight.position.set(0, 5, 5); 
        scene.add(dirLight);
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.5 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.0;
        scene.add(floor);
        window.mixer = null;
        let clock = new THREE.Clock();
        const loader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
        loader.setDRACOLoader(dracoLoader);
        const overlay = document.getElementById('loading-overlay');
        loader.load(
            'Leon_compressed.glb',
            (gltf) => {
                const object = gltf.scene;
                leonModel = object;
                window.leonObject = object;
                object.scale.set(1.0, 1.0, 1.0);
                object.position.set(0, -1.0, 0);
                const boneNames = [];
                const morphNames = [];
                object.traverse(function (child) {
                    if (child.isMesh || child.isSkinnedMesh) {
                        child.frustumCulled = false; 
                        if (child.material) {
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                            child.material.depthWrite = true;
                            child.material.needsUpdate = true;
                        }
                        if (child.morphTargetDictionary) {
                            const dict = child.morphTargetDictionary;
                            morphNames.push(`Mesh: ${child.name} -> ${Object.keys(dict).join(', ')}`);
                            for (let key in dict) {
                                let kl = key.toLowerCase();
                                if (kl.includes('jawopen') || kl.includes('mouthopen') || kl.includes('aa') || kl.includes('vrc.v_aa')) {
                                    activeMorphMesh = child;
                                    openMouthMorphIndex = dict[key];
                                }
                            }
                        }
                    }
                    if (child.isBone) {
                        boneNames.push(child.name);
                        const nameStr = child.name.toLowerCase();
                        if (nameStr.includes('head') && !nameStr.includes('top')) {
                            if (!headBone) headBone = child;
                        }
                        const isJaw = /jaw/i.test(child.name);
                        const isIgnored = /(chin|lip|tongue)/i.test(child.name);
                        const isLowerMouth = /(mouthlower|liplower)/i.test(child.name);
                        if (isLowerMouth) {
                            child.userData.initRotX = child.rotation.x;
                            child.userData.initPosY = child.position.y;
                            child.userData.initPosZ = child.position.z;
                            extraMouthBones.push(child);
                        }
                        if (isJaw && !isIgnored) {
                            if (!finalJawBone) {
                                finalJawBone = child;
                                finalJawBone.userData.initRotX = finalJawBone.rotation.x;
                            }
                        }
                    }
                });
                console.log("=== DIAGNÓSTICO DE BONES E MORPHS ===");
                console.log("Ossos encontrados:", boneNames.join(', '));
                console.log("Morph Targets encontrados:", morphNames.length > 0 ? morphNames.join(' | ') : "Nenhum");
                console.log("Osso Jaw Principal definido:", finalJawBone ? finalJawBone.name : "Nenhum detectado via Regex");
                console.log("Morph de Boca definido p/ Liveness:", activeMorphMesh ? "Sim, índice " + openMouthMorphIndex : "Nenhum");
                scene.add(object);
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 500);
                camera.position.set(0, 0.8, 2.5);
                camera.lookAt(0, 0.5, 0);
                animate();
            },
            (xhr) => {
            },
            (error) => {
                console.error("Error loading model:", error);
                overlay.innerHTML = '<p>Erro ao carregar o modelo.</p>';
            }
        );
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.7, 0); 
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        window.viewerControls = controls;
    };
    let targetHeadTurnY = 0;
    let currentHeadTurnY = 0;
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    function resetActive(except) {
        if(btnLeft && btnLeft !== except) btnLeft.classList.remove('active');
        if(btnRight && btnRight !== except) btnRight.classList.remove('active');
    }
    if(btnLeft) btnLeft.addEventListener('click', () => {
        btnLeft.classList.toggle('active');
        resetActive(btnLeft);
        targetHeadTurnY = btnLeft.classList.contains('active') ? Math.PI / 4 : 0;
    });
    if(btnRight) btnRight.addEventListener('click', () => {
        btnRight.classList.toggle('active');
        resetActive(btnRight);
        targetHeadTurnY = btnRight.classList.contains('active') ? -Math.PI / 4 : 0;
    });
    let isMouthOpen = false;
    const mouthSlider = document.getElementById('mouth-slider');
    if (mouthSlider) {
        mouthSlider.addEventListener('input', (e) => {
            mouthOpenValue = parseFloat(e.target.value);
            isMouthOpen = mouthOpenValue > 0.5;
        });
    }
    document.addEventListener('keydown', (e) => {
        if (screens.foto.classList.contains('active')) {
            const key = e.key.toLowerCase();
            if (key === 'a' && btnLeft) btnLeft.click();
            if (key === 'd' && btnRight) btnRight.click();
            if (key === 'w' || key === ' ') {
                isMouthOpen = !isMouthOpen;
                mouthOpenValue = isMouthOpen ? 1.0 : 0.0;
                if (mouthSlider) mouthSlider.value = mouthOpenValue;
            }
        }
    });
    function updateMouth(value) {
        if (activeMorphMesh && openMouthMorphIndex !== -1) {
            activeMorphMesh.morphTargetInfluences[openMouthMorphIndex] = value;
        } else if (finalJawBone && finalJawBone.userData.initRotX !== undefined) {
            const maxJawRot = 0.4; 
            const targetRot = finalJawBone.userData.initRotX + (value * maxJawRot);
            finalJawBone.rotation.x += (targetRot - finalJawBone.rotation.x) * 0.2;
            extraMouthBones.forEach(bone => {
                const bTarget = bone.userData.initRotX + (value * maxJawRot);
                bone.rotation.x += (bTarget - bone.rotation.x) * 0.2;
            });
        }
    }
    let shakeTime = 0;
    function animate() {
        requestAnimationFrame(animate);
        let delta = 0.016;
        if (typeof clock !== 'undefined') delta = clock.getDelta();
        if (window.mixer) window.mixer.update(delta);
        if (window.viewerControls) {
            window.viewerControls.update();
        }
        shakeTime += delta;
        const tremorAmount = 0.003;
        camera.position.x += Math.sin(shakeTime * 15) * tremorAmount * delta;
        camera.position.y += Math.cos(shakeTime * 17) * tremorAmount * delta;
        currentHeadTurnY += (targetHeadTurnY - currentHeadTurnY) * 0.1;
        updateMouth(mouthOpenValue);
        if (headBone) {
            headBone.rotation.x = currentHeadTurnY;
        } else if (leonModel) {
             leonModel.rotation.y = currentHeadTurnY;
        }
        renderer.render(scene, camera);
    }
});