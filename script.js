document.addEventListener('DOMContentLoaded', () => {
    // ---- Screen Navigation ----
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
        generateCPF(); // Generate one automatically upon entering
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

    // ---- CPF Generator Logic ----
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
        
        // Calculate first check digit
        cpf.push(calculateDigit(cpf, 10));
        
        // Calculate second check digit
        cpf.push(calculateDigit(cpf, 11));

        // Format CPF: XXX.XXX.XXX-XX
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

    // ---- CC Generator Logic ----
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

    window.generateCC = generateCC; // export to use in event listener
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

    // ---- 3D Viewer Logic ----
    window.viewerInitialized = false;
    let scene, camera, renderer, leonModel;
    let headBone = null, jawBone = null;
    let blinkMorphIndex = -1, mouthMorphIndex = -1;
    let activeMesh = null;
    let reqAnimFrame = null;
    let isBlinking = false, blinkWeight = 0, blinkDir = 1;
    let isTalking = false, mouthWeight = 0, mouthDir = 1;

    window.init3DViewer = function() {
        console.log("Initializing Three.js viewer...");
        window.viewerInitialized = true;
        
        const container = document.getElementById('canvas-container');
        
        scene = new THREE.Scene();
        
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.5, 3); // Aimed at face

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, logarithmicDepthBuffer: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Lights - Adjusted to balance visibility without overexposing (brighter than last)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(2, 5, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        // Generic Scene Background (Floor)
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111311, roughness: 0.8, metalness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.0;
        floor.receiveShadow = true;
        scene.add(floor);
        // Mixer for animations
        window.mixer = null;
        let clock = new THREE.Clock();

        // Loader
        const loader = new THREE.ColladaLoader();
        const overlay = document.getElementById('loading-overlay');
        
        // Load the Leon DAE
        loader.load(
            'leon_model/fbx_explore_survivor_leon.dae',
            (collada) => {
                const object = collada.scene;
                leonModel = object;
                
                // Set scale globally for mobile models
                object.scale.set(1.0, 1.0, 1.0);
                object.position.set(0, -1.0, 0);
                
                const textureLoader = new THREE.TextureLoader();
                const texDiff = textureLoader.load('leon_model/tex_explore_survivor_leon.png');
                // Traverse and process materials & bones
                object.traverse(function (child) {
                    if (child.isMesh || child.isSkinnedMesh) { // Added isSkinnedMesh back
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (child.material) {
                            const mats = Array.isArray(child.material) ? child.material : [child.material];
                            mats.forEach(m => {
                                m.map = texDiff; // Apply texture
                                m.skinning = true;
                                m.morphTargets = true;
                                m.transparent = false;
                                m.opacity = 1.0;
                                m.depthWrite = true;
                                m.needsUpdate = true;
                                m.side = THREE.DoubleSide;
                                // Reset color to be brighter but not blinding white
                                if(m.color) m.color.setHex(0xd0d0d0); 
                                if(m.emissive) m.emissive.setHex(0x000000); 
                            });
                        }
                        
                        // Check for morph targets (blendshapes) for blinking/mouth
                        if (child.morphTargetDictionary) {
                            console.log("Found Morph Targets on:", child.name, Object.keys(child.morphTargetDictionary));
                            activeMesh = child;
                            for (let key in child.morphTargetDictionary) {
                                let kl = key.toLowerCase();
                                if (kl.includes('blink') || kl.includes('eye_close') || kl.includes('close')) blinkMorphIndex = child.morphTargetDictionary[key];
                                if (kl.includes('mouth_open') || kl.includes('jaw_drop') || kl.includes('aa') || kl.includes('ah') || kl.includes('open')) mouthMorphIndex = child.morphTargetDictionary[key];
                            }
                        }
                    }
                    if (child.isBone) {
                        let name = child.name.toLowerCase();
                        if (name.includes('head') && !name.includes('top')) { // Refined head bone search
                            if (!headBone) headBone = child;
                        }
                        if (name.includes('eye') || name.includes('lid')) {
                            if (!eyeBone) eyeBone = child;
                        }
                    }
                });

                scene.add(object);
                
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 500);

                // Adjust camera closer to capture full body with orbit focus
                camera.position.set(0, 0.8, 2.5);
                camera.lookAt(0, 0.5, 0);
                
                // Start rendering
                animate();
            },
            (xhr) => {
                // Progress
            },
            (error) => {
                console.error("Error loading model:", error);
                overlay.innerHTML = '<p>Erro ao carregar o modelo.</p>';
            }
        );

        // Setup OrbitControls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0.7, 0); // Focus on the model center

        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        
        // Save controls to window if we need to access them
        window.viewerControls = controls;
    };

    // Animation State
    let targetHeadTurnY = 0;
    let currentHeadTurnY = 0;

    // Controls
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

    // Keyboard Hotkeys
    document.addEventListener('keydown', (e) => {
        // Only respond to hotkeys if the foto screen is active
        if (screens.foto.classList.contains('active')) {
            const key = e.key.toLowerCase();
            if (key === 'a' && btnLeft) btnLeft.click();
            if (key === 'd' && btnRight) btnRight.click();
        }
    });

    function animate() {
        requestAnimationFrame(animate);
        
        let delta = 0.016;
        if (typeof clock !== 'undefined') delta = clock.getDelta();
        if (window.mixer) window.mixer.update(delta);
        
        if (window.viewerControls) {
            window.viewerControls.update();
        }
        
        // Smooth Interpolation from Point A to B
        currentHeadTurnY += (targetHeadTurnY - currentHeadTurnY) * 0.1;

        // Apply animations
        if (headBone) {
            // Turn Face (Leon) - X axis twists left/right correctly for this rig mostly
            headBone.rotation.x = currentHeadTurnY;
        } else if (leonModel) {
             // Fallback
             leonModel.rotation.y = currentHeadTurnY;
        }

        renderer.render(scene, camera);
    }
});
