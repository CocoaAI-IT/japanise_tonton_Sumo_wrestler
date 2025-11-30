// メインゲームクラス
class TontonSumo {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.dohyo = null; // 土俵
        this.wrestlers = []; // 力士
        this.gameState = 'start'; // start, playing, ended
        this.accelerationData = { x: 0, y: 0, z: 0 };
        this.lastAcceleration = { x: 0, y: 0, z: 0 };
        this.debugMode = true; // デバッグモード

        this.init();
        this.setupEventListeners();
    }

    init() {
        // Three.jsシーンの初期化
        this.setupThreeJS();

        // Cannon.js物理世界の初期化
        this.setupPhysics();

        // 土俵の作成
        this.createDohyo();

        // 力士の作成
        this.createWrestlers();

        // ライティング
        this.setupLighting();

        // アニメーションループ開始
        this.animate();
    }

    setupThreeJS() {
        // シーン
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

        // カメラ
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 8, 12);
        this.camera.lookAt(0, 0, 0);

        // レンダラー
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // リサイズ対応
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupPhysics() {
        // Cannon.js物理世界
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        // 地面のマテリアル
        const groundMaterial = new CANNON.Material('groundMaterial');
        const wrestlerMaterial = new CANNON.Material('wrestlerMaterial');

        // 接触マテリアル（摩擦と反発）
        const wrestlerGroundContact = new CANNON.ContactMaterial(
            groundMaterial,
            wrestlerMaterial,
            {
                friction: 0.2,  // 摩擦を減らして動きやすく
                restitution: 0.4  // 反発を少し上げる
            }
        );
        this.world.addContactMaterial(wrestlerGroundContact);

        // 力士同士の接触
        const wrestlerWrestlerContact = new CANNON.ContactMaterial(
            wrestlerMaterial,
            wrestlerMaterial,
            {
                friction: 0.2,  // 摩擦を減らす
                restitution: 0.6  // 反発を上げる
            }
        );
        this.world.addContactMaterial(wrestlerWrestlerContact);

        this.groundMaterial = groundMaterial;
        this.wrestlerMaterial = wrestlerMaterial;
    }

    createDohyo() {
        // 土俵のプラットフォーム（円形）
        const dohyoRadius = 5;
        const dohyoHeight = 0.5;

        // Three.js視覚的メッシュ
        const geometry = new THREE.CylinderGeometry(dohyoRadius, dohyoRadius, dohyoHeight, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8,
            metalness: 0.2
        });
        const dohyoMesh = new THREE.Mesh(geometry, material);
        dohyoMesh.position.set(0, -dohyoHeight / 2, 0);
        dohyoMesh.receiveShadow = true;
        this.scene.add(dohyoMesh);

        // 土俵の線（俵）
        const edgeGeometry = new THREE.TorusGeometry(dohyoRadius, 0.1, 16, 50);
        const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0.05;
        this.scene.add(edge);

        // Cannon.js物理ボディ
        const dohyoShape = new CANNON.Cylinder(dohyoRadius, dohyoRadius, dohyoHeight, 32);
        const dohyoBody = new CANNON.Body({
            mass: 0, // 静的オブジェクト
            material: this.groundMaterial
        });
        dohyoBody.addShape(dohyoShape);
        dohyoBody.position.set(0, -dohyoHeight / 2, 0);
        dohyoBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(dohyoBody);

        this.dohyo = {
            mesh: dohyoMesh,
            body: dohyoBody,
            radius: dohyoRadius,
            center: new THREE.Vector3(0, 0, 0)
        };
    }

    createWrestlers() {
        // 力士を2体作成
        const wrestlerData = [
            {
                color: 0xff0000,
                position: new CANNON.Vec3(-2, 2, 0),
                name: 'red'
            },
            {
                color: 0x0000ff,
                position: new CANNON.Vec3(2, 2, 0),
                name: 'blue'
            }
        ];

        wrestlerData.forEach(data => {
            const wrestler = this.createWrestler(data.color, data.position, data.name);
            this.wrestlers.push(wrestler);
        });
    }

    createWrestler(color, position, name) {
        // 力士のサイズ
        const bodyWidth = 0.8;
        const bodyHeight = 1.2;
        const bodyDepth = 0.6;

        // グループ（体全体）
        const wrestlerGroup = new THREE.Group();

        // 胴体（箱型）
        const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        wrestlerGroup.add(bodyMesh);

        // 頭（球体）
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.y = bodyHeight / 2 + 0.3;
        headMesh.castShadow = true;
        wrestlerGroup.add(headMesh);

        // 髷（まげ）
        const mageGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
        const mageMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const mageMesh = new THREE.Mesh(mageGeometry, mageMaterial);
        mageMesh.position.y = bodyHeight / 2 + 0.6;
        mageMesh.castShadow = true;
        wrestlerGroup.add(mageMesh);

        // 脚（2本）
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: color });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.25, -bodyHeight / 2 - 0.3, 0);
        leftLeg.castShadow = true;
        wrestlerGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.25, -bodyHeight / 2 - 0.3, 0);
        rightLeg.castShadow = true;
        wrestlerGroup.add(rightLeg);

        wrestlerGroup.position.copy(position);
        this.scene.add(wrestlerGroup);

        // Cannon.js物理ボディ（箱型で近似）
        const wrestlerShape = new CANNON.Box(new CANNON.Vec3(bodyWidth / 2, bodyHeight / 2 + 0.3, bodyDepth / 2));
        const wrestlerBody = new CANNON.Body({
            mass: 0.5,  // 質量を半分に減らして軽くする
            material: this.wrestlerMaterial,
            linearDamping: 0.1,  // ダンピングを減らして動きやすく
            angularDamping: 0.1
        });
        wrestlerBody.addShape(wrestlerShape);
        wrestlerBody.position.copy(position);
        this.world.addBody(wrestlerBody);

        return {
            mesh: wrestlerGroup,
            body: wrestlerBody,
            name: name,
            isOut: false,
            isDown: false
        };
    }

    setupLighting() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // ディレクショナルライト
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // ポイントライト（土俵の上）
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }

    setupEventListeners() {
        // スタートボタン
        document.getElementById('start-button').addEventListener('click', () => {
            this.requestMotionPermission();
        });

        // リセットボタン
        document.getElementById('reset-button').addEventListener('click', () => {
            this.resetGame();
        });

        // 再スタートボタン
        document.getElementById('restart-button').addEventListener('click', () => {
            this.resetGame();
            this.hideScreen('result-screen');
            this.showScreen('game-screen');
            this.gameState = 'playing';
        });

        // テスト用：画面タップで振動を発生
        document.addEventListener('touchstart', (e) => {
            if (this.gameState === 'playing') {
                this.applyTapShake();
            }
        });

        // PC用：クリックで振動を発生
        document.addEventListener('click', (e) => {
            if (this.gameState === 'playing' && e.target.tagName !== 'BUTTON') {
                this.applyTapShake();
            }
        });
    }

    async requestMotionPermission() {
        // iOS 13+での加速度センサー許可リクエスト
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    this.startGame();
                } else {
                    alert('加速度センサーの許可が必要です');
                }
            } catch (error) {
                console.error('Permission error:', error);
                alert('加速度センサーの許可に失敗しました');
            }
        } else {
            // Android等、許可不要なデバイス
            this.startGame();
        }
    }

    startGame() {
        this.hideScreen('start-screen');
        this.showScreen('game-screen');
        this.gameState = 'playing';

        // 加速度センサーのリスナー
        window.addEventListener('devicemotion', (event) => {
            // 前回の加速度を保存
            this.lastAcceleration = { ...this.accelerationData };

            // 重力を除いた純粋な加速度を優先使用
            if (event.acceleration && (event.acceleration.x !== null || event.acceleration.y !== null)) {
                this.accelerationData.x = event.acceleration.x || 0;
                this.accelerationData.y = event.acceleration.y || 0;
                this.accelerationData.z = event.acceleration.z || 0;
            } else if (event.accelerationIncludingGravity) {
                // フォールバック：重力込みの加速度
                this.accelerationData.x = event.accelerationIncludingGravity.x || 0;
                this.accelerationData.y = event.accelerationIncludingGravity.y || 0;
                this.accelerationData.z = event.accelerationIncludingGravity.z || 0;
            }

            // デバッグ表示
            if (this.debugMode) {
                this.showDebugInfo();
            }
        });

        this.updateStatus();
    }

    applyAccelerationToField() {
        if (this.gameState !== 'playing') return;

        // 加速度の変化量を計算（デルタ）
        const deltaX = this.accelerationData.x - this.lastAcceleration.x;
        const deltaY = this.accelerationData.y - this.lastAcceleration.y;
        const deltaZ = this.accelerationData.z - this.lastAcceleration.z;

        // 振動の強度を大幅に増加（20倍）
        const intensity = 20.0;

        // 加速度の大きさを計算
        const magnitude = Math.sqrt(
            this.accelerationData.x ** 2 +
            this.accelerationData.y ** 2 +
            this.accelerationData.z ** 2
        );

        this.wrestlers.forEach(wrestler => {
            if (!wrestler.isOut && !wrestler.isDown) {
                // 加速度を力として適用（デルタを使用）
                const forceX = deltaX * intensity;
                const forceZ = deltaZ * intensity;

                // 現在の加速度も追加で適用（常に少しずつ動くように）
                const constantForceX = this.accelerationData.x * 2.0;
                const constantForceZ = this.accelerationData.z * 2.0;

                wrestler.body.applyForce(
                    new CANNON.Vec3(
                        forceX + constantForceX,
                        0,
                        forceZ + constantForceZ
                    ),
                    wrestler.body.position
                );

                // 振動に応じたトルクを適用（揺れを再現）
                const torqueIntensity = magnitude * 0.5;
                const torque = new CANNON.Vec3(
                    (Math.random() - 0.5) * torqueIntensity,
                    (Math.random() - 0.5) * torqueIntensity * 0.5,
                    (Math.random() - 0.5) * torqueIntensity
                );
                wrestler.body.applyTorque(torque);

                // ランダムな衝撃を追加（とんとん感を出す）
                if (Math.abs(deltaX) > 0.5 || Math.abs(deltaZ) > 0.5) {
                    const impulse = new CANNON.Vec3(
                        (Math.random() - 0.5) * 5,
                        Math.random() * 2,
                        (Math.random() - 0.5) * 5
                    );
                    wrestler.body.applyImpulse(impulse, wrestler.body.position);
                }
            }
        });
    }

    // タップで振動を発生させる
    applyTapShake() {
        this.wrestlers.forEach(wrestler => {
            if (!wrestler.isOut && !wrestler.isDown) {
                // ランダムな方向に力を加える
                const randomForce = new CANNON.Vec3(
                    (Math.random() - 0.5) * 30,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 30
                );
                wrestler.body.applyImpulse(randomForce, wrestler.body.position);

                // トルクも追加
                const torque = new CANNON.Vec3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 10
                );
                wrestler.body.applyTorque(torque);
            }
        });
    }

    // デバッグ情報を表示
    showDebugInfo() {
        const debugDiv = document.getElementById('debug-info');
        if (debugDiv) {
            debugDiv.innerHTML = `
                <strong>加速度データ:</strong><br>
                X: ${this.accelerationData.x.toFixed(2)}<br>
                Y: ${this.accelerationData.y.toFixed(2)}<br>
                Z: ${this.accelerationData.z.toFixed(2)}<br>
                <strong>デルタ:</strong><br>
                ΔX: ${(this.accelerationData.x - this.lastAcceleration.x).toFixed(2)}<br>
                ΔY: ${(this.accelerationData.y - this.lastAcceleration.y).toFixed(2)}<br>
                ΔZ: ${(this.accelerationData.z - this.lastAcceleration.z).toFixed(2)}
            `;
        }
    }

    checkWinConditions() {
        if (this.gameState !== 'playing') return;

        let activeWrestlers = 0;
        let winner = null;

        this.wrestlers.forEach(wrestler => {
            // 土俵から出たかチェック
            const distance = Math.sqrt(
                wrestler.body.position.x ** 2 +
                wrestler.body.position.z ** 2
            );

            if (distance > this.dohyo.radius && !wrestler.isOut) {
                wrestler.isOut = true;
            }

            // 倒れたかチェック（回転角度で判定）
            const rotation = wrestler.body.quaternion;
            const euler = new CANNON.Vec3();
            rotation.toEuler(euler);

            // X軸またはZ軸の回転が大きい場合は倒れたと判定
            if ((Math.abs(euler.x) > Math.PI / 4 || Math.abs(euler.z) > Math.PI / 4) && !wrestler.isDown) {
                wrestler.isDown = true;
            }

            // まだ有効な力士をカウント
            if (!wrestler.isOut && !wrestler.isDown) {
                activeWrestlers++;
                winner = wrestler;
            }
        });

        // ステータス更新
        this.updateStatus();

        // 勝敗判定
        if (activeWrestlers === 1) {
            this.endGame(winner);
        } else if (activeWrestlers === 0) {
            this.endGame(null); // 引き分け
        }
    }

    updateStatus() {
        const redWrestler = this.wrestlers.find(w => w.name === 'red');
        const blueWrestler = this.wrestlers.find(w => w.name === 'blue');

        const redStatus = document.getElementById('red-status');
        const blueStatus = document.getElementById('blue-status');

        if (redWrestler) {
            redStatus.className = 'status';
            if (redWrestler.isOut) {
                redStatus.textContent = '場外';
                redStatus.classList.add('out');
            } else if (redWrestler.isDown) {
                redStatus.textContent = '倒れた';
                redStatus.classList.add('down');
            } else {
                redStatus.textContent = '準備完了';
                redStatus.classList.add('ready');
            }
        }

        if (blueWrestler) {
            blueStatus.className = 'status';
            if (blueWrestler.isOut) {
                blueStatus.textContent = '場外';
                blueStatus.classList.add('out');
            } else if (blueWrestler.isDown) {
                blueStatus.textContent = '倒れた';
                blueStatus.classList.add('down');
            } else {
                blueStatus.textContent = '準備完了';
                blueStatus.classList.add('ready');
            }
        }
    }

    endGame(winner) {
        this.gameState = 'ended';

        const winnerText = document.getElementById('winner-text');
        if (winner) {
            const winnerName = winner.name === 'red' ? '赤の力士' : '青の力士';
            winnerText.textContent = `${winnerName}の勝ち！`;
        } else {
            winnerText.textContent = '引き分け！';
        }

        setTimeout(() => {
            this.hideScreen('game-screen');
            this.showScreen('result-screen');
        }, 1000);
    }

    resetGame() {
        // 力士の位置と状態をリセット
        this.wrestlers[0].body.position.set(-2, 2, 0);
        this.wrestlers[0].body.velocity.set(0, 0, 0);
        this.wrestlers[0].body.angularVelocity.set(0, 0, 0);
        this.wrestlers[0].body.quaternion.set(0, 0, 0, 1);
        this.wrestlers[0].isOut = false;
        this.wrestlers[0].isDown = false;

        this.wrestlers[1].body.position.set(2, 2, 0);
        this.wrestlers[1].body.velocity.set(0, 0, 0);
        this.wrestlers[1].body.angularVelocity.set(0, 0, 0);
        this.wrestlers[1].body.quaternion.set(0, 0, 0, 1);
        this.wrestlers[1].isOut = false;
        this.wrestlers[1].isDown = false;

        this.gameState = 'playing';
        this.updateStatus();
    }

    showScreen(screenId) {
        document.getElementById(screenId).classList.add('active');
    }

    hideScreen(screenId) {
        document.getElementById(screenId).classList.remove('active');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 物理演算の更新
        this.world.step(1 / 60);

        // 加速度の適用
        this.applyAccelerationToField();

        // 勝敗判定
        this.checkWinConditions();

        // Three.jsオブジェクトを物理ボディと同期
        this.wrestlers.forEach(wrestler => {
            wrestler.mesh.position.copy(wrestler.body.position);
            wrestler.mesh.quaternion.copy(wrestler.body.quaternion);
        });

        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new TontonSumo();
});
