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
        this.dohyoTilt = { x: 0, z: 0 }; // 土俵の傾き
        this.targetTilt = { x: 0, z: 0 }; // 目標の傾き

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

        // カメラ（斜め上から見下ろす視点）
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 10, 10);  // 斜め上から見下ろす
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
                friction: 0.4,  // 摩擦を上げて滑りすぎないように
                restitution: 0.2  // 反発を減らす
            }
        );
        this.world.addContactMaterial(wrestlerGroundContact);

        // 力士同士の接触
        const wrestlerWrestlerContact = new CANNON.ContactMaterial(
            wrestlerMaterial,
            wrestlerMaterial,
            {
                friction: 0.3,
                restitution: 0.3
            }
        );
        this.world.addContactMaterial(wrestlerWrestlerContact);

        this.groundMaterial = groundMaterial;
        this.wrestlerMaterial = wrestlerMaterial;
    }

    createDohyo() {
        // 土俵のプラットフォーム（箱型）
        const dohyoWidth = 10;   // X軸方向
        const dohyoDepth = 8;    // Z軸方向
        const dohyoHeight = 1.5; // Y軸方向（箱の高さ）

        // Three.js視覚的メッシュをグループにまとめる
        const dohyoGroup = new THREE.Group();

        // 土俵本体（箱型）
        const geometry = new THREE.BoxGeometry(dohyoWidth, dohyoHeight, dohyoDepth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8,
            metalness: 0.2
        });
        const dohyoMesh = new THREE.Mesh(geometry, material);
        dohyoMesh.receiveShadow = true;
        dohyoGroup.add(dohyoMesh);

        // 円形の土俵ライン（俵）- 土俵上面に配置
        const ringRadius = 3;  // 円形土俵の半径
        const ringTube = 0.1;  // 俵の太さ
        const torusGeometry = new THREE.TorusGeometry(ringRadius, ringTube, 16, 100);
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7
        });
        const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
        torusMesh.rotation.x = Math.PI / 2;  // 水平に配置
        torusMesh.position.y = dohyoHeight / 2 + 0.01;  // 土俵上面のすぐ上
        dohyoGroup.add(torusMesh);

        // 四隅の丸マーカー（青と赤）
        const markerRadius = 0.3;
        const markerGeometry = new THREE.CircleGeometry(markerRadius, 32);

        // 左奥 - 青
        const blueMarker1 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
        );
        blueMarker1.rotation.x = -Math.PI / 2;
        blueMarker1.position.set(-dohyoWidth / 2 + 0.8, dohyoHeight / 2 + 0.02, -dohyoDepth / 2 + 0.8);
        dohyoGroup.add(blueMarker1);

        // 右奥 - 赤
        const redMarker1 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        );
        redMarker1.rotation.x = -Math.PI / 2;
        redMarker1.position.set(dohyoWidth / 2 - 0.8, dohyoHeight / 2 + 0.02, -dohyoDepth / 2 + 0.8);
        dohyoGroup.add(redMarker1);

        // 左手前 - 青
        const blueMarker2 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
        );
        blueMarker2.rotation.x = -Math.PI / 2;
        blueMarker2.position.set(-dohyoWidth / 2 + 0.8, dohyoHeight / 2 + 0.02, dohyoDepth / 2 - 0.8);
        dohyoGroup.add(blueMarker2);

        // 右手前 - 赤
        const redMarker2 = new THREE.Mesh(
            markerGeometry,
            new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        );
        redMarker2.rotation.x = -Math.PI / 2;
        redMarker2.position.set(dohyoWidth / 2 - 0.8, dohyoHeight / 2 + 0.02, dohyoDepth / 2 - 0.8);
        dohyoGroup.add(redMarker2);

        dohyoGroup.position.set(0, 0, 0);
        this.scene.add(dohyoGroup);

        // Cannon.js物理ボディ（水平な平面）
        const dohyoShape = new CANNON.Box(new CANNON.Vec3(dohyoWidth / 2, dohyoHeight / 2, dohyoDepth / 2));
        const dohyoBody = new CANNON.Body({
            mass: 100, // 動的オブジェクト（重い）
            material: this.groundMaterial,
            linearDamping: 0.99, // 動きを抑制
            angularDamping: 0.99 // 回転を抑制
        });
        dohyoBody.addShape(dohyoShape);
        dohyoBody.position.set(0, 0, 0);
        dohyoBody.quaternion.set(0, 0, 0, 1); // 初期回転なし

        // キネマティックボディに変更
        dohyoBody.type = CANNON.Body.KINEMATIC;

        this.world.addBody(dohyoBody);

        this.dohyo = {
            mesh: dohyoGroup,
            body: dohyoBody,
            width: dohyoWidth,
            depth: dohyoDepth,
            center: new THREE.Vector3(0, 0, 0),
            baseQuaternion: dohyoBody.quaternion.clone() // 初期回転を保存
        };
    }

    createWrestlers() {
        // 力士を2体作成（土俵の上、Z軸方向に配置）
        const dohyoTopY = 0.75 + 0.6;  // 土俵上面 + 力士の高さ半分
        const wrestlerData = [
            {
                color: 0xff0000,
                position: new CANNON.Vec3(0, dohyoTopY, -2),  // 奥側
                name: 'red'
            },
            {
                color: 0x0000ff,
                position: new CANNON.Vec3(0, dohyoTopY, 2),   // 手前側
                name: 'blue'
            }
        ];

        wrestlerData.forEach(data => {
            const wrestler = this.createWrestler(data.color, data.position, data.name);
            this.wrestlers.push(wrestler);
        });
    }

    createWrestler(color, position, name) {
        // 紙で折った力士（上から見て∧のくの字形状）
        const wrestlerWidth = 0.8;   // X軸方向の幅
        const wrestlerHeight = 1.2;  // Y軸方向の高さ
        const wrestlerDepth = 0.05;  // Z軸方向の厚み（紙の厚さ）

        // グループ（体全体）
        const wrestlerGroup = new THREE.Group();

        // くの字を2つの平面で作成（上から見て∧形状）
        // 左側の平面
        const leftGeometry = new THREE.BoxGeometry(wrestlerWidth / 2, wrestlerHeight, wrestlerDepth);
        const leftMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
        leftMesh.rotation.y = -Math.PI / 6;  // Y軸周りに-30度回転
        leftMesh.position.x = -wrestlerWidth / 4;
        leftMesh.castShadow = true;
        wrestlerGroup.add(leftMesh);

        // 右側の平面
        const rightGeometry = new THREE.BoxGeometry(wrestlerWidth / 2, wrestlerHeight, wrestlerDepth);
        const rightMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const rightMesh = new THREE.Mesh(rightGeometry, rightMaterial);
        rightMesh.rotation.y = Math.PI / 6;  // Y軸周りに+30度回転
        rightMesh.position.x = wrestlerWidth / 4;
        rightMesh.castShadow = true;
        wrestlerGroup.add(rightMesh);

        // 顔部分（円）- 上向きに配置
        const faceGeometry = new THREE.CircleGeometry(0.25, 16);
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdbac,
            side: THREE.DoubleSide
        });
        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.position.set(0, wrestlerHeight / 2 - 0.15, 0);
        faceMesh.rotation.x = -Math.PI / 2;  // 上向きに
        wrestlerGroup.add(faceMesh);

        // 髷（黒い円）
        const mageGeometry = new THREE.CircleGeometry(0.12, 8);
        const mageMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const mageMesh = new THREE.Mesh(mageGeometry, mageMaterial);
        mageMesh.position.set(0, wrestlerHeight / 2 - 0.05, 0.1);
        mageMesh.rotation.x = -Math.PI / 2;  // 上向きに
        wrestlerGroup.add(mageMesh);

        wrestlerGroup.position.copy(position);
        this.scene.add(wrestlerGroup);

        // Cannon.js物理ボディ（くの字形状を箱で近似）
        const wrestlerShape = new CANNON.Box(
            new CANNON.Vec3(wrestlerWidth / 2, wrestlerHeight / 2, wrestlerDepth * 3)
        );
        const wrestlerBody = new CANNON.Body({
            mass: 0.25,  // 紙のように軽く
            material: this.wrestlerMaterial,
            linearDamping: 0.3,
            angularDamping: 0.5
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

        // ディレクショナルライト（斜め上から）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 上からのライト（土俵を照らす）
        const topLight = new THREE.PointLight(0xffffff, 0.4);
        topLight.position.set(0, 5, 0);
        this.scene.add(topLight);
    }

    setupEventListeners() {
        // スタートボタン
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
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

        // 四隅のタップエリア
        const tapAreas = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        tapAreas.forEach(areaId => {
            const area = document.getElementById(`tap-${areaId}`);
            if (area) {
                // タッチイベント
                area.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleTap(areaId);
                });
                // クリックイベント（PC用）
                area.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.handleTap(areaId);
                });
            }
        });
    }

    startGame() {
        this.hideScreen('start-screen');
        this.showScreen('game-screen');
        this.gameState = 'playing';
        this.updateStatus();
    }

    // タップエリアがタップされた時の処理
    handleTap(position) {
        if (this.gameState !== 'playing') return;

        // タップ位置に応じて土俵の傾き方向を決定
        const tiltAmount = 0.1; // 傾きの大きさ（ラジアン）

        switch(position) {
            case 'top-left':
                // 左上をタップ → 土俵を手前・左に傾ける
                this.targetTilt.x = -tiltAmount;  // Z軸周り：左に傾く
                this.targetTilt.z = tiltAmount;   // X軸周り：手前に傾く
                break;
            case 'top-right':
                // 右上をタップ → 土俵を手前・右に傾ける
                this.targetTilt.x = tiltAmount;   // Z軸周り：右に傾く
                this.targetTilt.z = tiltAmount;   // X軸周り：手前に傾く
                break;
            case 'bottom-left':
                // 左下をタップ → 土俵を奥・左に傾ける
                this.targetTilt.x = -tiltAmount;  // Z軸周り：左に傾く
                this.targetTilt.z = -tiltAmount;  // X軸周り：奥に傾く
                break;
            case 'bottom-right':
                // 右下をタップ → 土俵を奥・右に傾ける
                this.targetTilt.x = tiltAmount;   // Z軸周り：右に傾く
                this.targetTilt.z = -tiltAmount;  // X軸周り：奥に傾く
                break;
        }

        // タップエリアに視覚的フィードバック
        const tapArea = document.getElementById(`tap-${position}`);
        if (tapArea) {
            tapArea.classList.add('active');
            setTimeout(() => {
                tapArea.classList.remove('active');
            }, 100);
        }
    }

    // 土俵の傾きを更新
    updateDohyoTilt() {
        if (this.gameState !== 'playing') return;

        // 目標の傾きに向かってスムーズに移動
        const lerpSpeed = 0.2;
        this.dohyoTilt.x += (this.targetTilt.x - this.dohyoTilt.x) * lerpSpeed;
        this.dohyoTilt.z += (this.targetTilt.z - this.dohyoTilt.z) * lerpSpeed;

        // 自然に水平に戻る（復元力）
        const restoreSpeed = 0.05;
        this.targetTilt.x *= (1 - restoreSpeed);
        this.targetTilt.z *= (1 - restoreSpeed);

        // 土俵の回転を更新
        // Z軸周りの回転（左右の傾き）
        const tiltQuatZ = new CANNON.Quaternion();
        tiltQuatZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), this.dohyoTilt.x);

        // X軸周りの回転（手前奥の傾き）
        const tiltQuatX = new CANNON.Quaternion();
        tiltQuatX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), this.dohyoTilt.z);

        // クォータニオンを合成
        this.dohyo.body.quaternion = tiltQuatZ.mult(tiltQuatX);
    }

    checkWinConditions() {
        if (this.gameState !== 'playing') return;

        let activeWrestlers = 0;
        let winner = null;

        this.wrestlers.forEach(wrestler => {
            // 土俵から出たかチェック（X軸とZ軸の範囲）
            const halfWidth = this.dohyo.width / 2;
            const halfDepth = this.dohyo.depth / 2;

            if (
                (Math.abs(wrestler.body.position.x) > halfWidth ||
                Math.abs(wrestler.body.position.z) > halfDepth) &&
                !wrestler.isOut
            ) {
                wrestler.isOut = true;
            }

            // 土俵より下に落ちたかチェック
            if (wrestler.body.position.y < -0.5 && !wrestler.isOut) {
                wrestler.isOut = true;
            }

            // 倒れたかチェック（Y軸の回転で判定）
            const rotation = wrestler.body.quaternion;
            const euler = new CANNON.Vec3();
            rotation.toEuler(euler);

            // Y軸の回転が大きい場合は倒れたと判定
            if (Math.abs(euler.y) > Math.PI / 3 && !wrestler.isDown) {
                wrestler.isDown = true;
            }

            // X軸やZ軸の回転も確認（前後左右に倒れる）
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
        // 土俵の傾きをリセット
        this.dohyoTilt = { x: 0, z: 0 };
        this.targetTilt = { x: 0, z: 0 };
        this.dohyo.body.quaternion.copy(this.dohyo.baseQuaternion);
        this.dohyo.body.velocity.set(0, 0, 0);
        this.dohyo.body.angularVelocity.set(0, 0, 0);

        // 力士の位置と状態をリセット
        const dohyoTopY = 0.75 + 0.6;  // 土俵上面 + 力士の高さ半分
        this.wrestlers[0].body.position.set(0, dohyoTopY, -2);  // 奥側
        this.wrestlers[0].body.velocity.set(0, 0, 0);
        this.wrestlers[0].body.angularVelocity.set(0, 0, 0);
        this.wrestlers[0].body.quaternion.set(0, 0, 0, 1);
        this.wrestlers[0].isOut = false;
        this.wrestlers[0].isDown = false;

        this.wrestlers[1].body.position.set(0, dohyoTopY, 2);   // 手前側
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

        // 土俵の傾きを更新
        this.updateDohyoTilt();

        // 物理演算の更新
        this.world.step(1 / 60);

        // 勝敗判定
        this.checkWinConditions();

        // Three.jsオブジェクトを物理ボディと同期
        // 土俵
        this.dohyo.mesh.position.copy(this.dohyo.body.position);
        this.dohyo.mesh.quaternion.copy(this.dohyo.body.quaternion);

        // 力士
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
