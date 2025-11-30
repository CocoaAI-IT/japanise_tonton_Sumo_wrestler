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

        // カメラ（横から見る視点）
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 15);  // 正面から見る
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
        // 土俵のプラットフォーム（平面、垂直に配置）
        const dohyoWidth = 10;
        const dohyoHeight = 8;
        const dohyoDepth = 0.5;

        // Three.js視覚的メッシュをグループにまとめる
        const dohyoGroup = new THREE.Group();

        // 土俵本体（平面）
        const geometry = new THREE.BoxGeometry(dohyoWidth, dohyoHeight, dohyoDepth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd2b48c,
            roughness: 0.8,
            metalness: 0.2
        });
        const dohyoMesh = new THREE.Mesh(geometry, material);
        dohyoMesh.receiveShadow = true;
        dohyoGroup.add(dohyoMesh);

        // 土俵の枠（俵）
        const frameThickness = 0.2;
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

        // 上の枠
        const topFrame = new THREE.Mesh(
            new THREE.BoxGeometry(dohyoWidth, frameThickness, frameThickness),
            frameMaterial
        );
        topFrame.position.set(0, dohyoHeight / 2, dohyoDepth / 2 + frameThickness / 2);
        dohyoGroup.add(topFrame);

        // 下の枠
        const bottomFrame = new THREE.Mesh(
            new THREE.BoxGeometry(dohyoWidth, frameThickness, frameThickness),
            frameMaterial
        );
        bottomFrame.position.set(0, -dohyoHeight / 2, dohyoDepth / 2 + frameThickness / 2);
        dohyoGroup.add(bottomFrame);

        // 左の枠
        const leftFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameThickness, dohyoHeight, frameThickness),
            frameMaterial
        );
        leftFrame.position.set(-dohyoWidth / 2, 0, dohyoDepth / 2 + frameThickness / 2);
        dohyoGroup.add(leftFrame);

        // 右の枠
        const rightFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameThickness, dohyoHeight, frameThickness),
            frameMaterial
        );
        rightFrame.position.set(dohyoWidth / 2, 0, dohyoDepth / 2 + frameThickness / 2);
        dohyoGroup.add(rightFrame);

        dohyoGroup.position.set(0, 0, 0);
        this.scene.add(dohyoGroup);

        // Cannon.js物理ボディ（平面）
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
            height: dohyoHeight,
            center: new THREE.Vector3(0, 0, 0),
            baseQuaternion: dohyoBody.quaternion.clone() // 初期回転を保存
        };
    }

    createWrestlers() {
        // 力士を2体作成（垂直配置）
        const wrestlerData = [
            {
                color: 0xff0000,
                position: new CANNON.Vec3(-2.5, 0, 1),  // 左側
                name: 'red'
            },
            {
                color: 0x0000ff,
                position: new CANNON.Vec3(2.5, 0, 1),   // 右側
                name: 'blue'
            }
        ];

        wrestlerData.forEach(data => {
            const wrestler = this.createWrestler(data.color, data.position, data.name);
            this.wrestlers.push(wrestler);
        });
    }

    createWrestler(color, position, name) {
        // 紙で折った力士（くの字形状）のサイズ
        const wrestlerWidth = 0.1;   // 紙の厚み
        const wrestlerHeight = 1.5;  // 高さ
        const wrestlerDepth = 1.0;   // 奥行き

        // グループ（体全体）
        const wrestlerGroup = new THREE.Group();

        // くの字を2つの平面で作成
        // 前面
        const frontGeometry = new THREE.BoxGeometry(wrestlerWidth, wrestlerHeight, wrestlerDepth);
        const frontMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
        frontMesh.rotation.y = -Math.PI / 12;  // 少し角度をつける
        frontMesh.position.x = -0.1;
        frontMesh.castShadow = true;
        wrestlerGroup.add(frontMesh);

        // 後面
        const backGeometry = new THREE.BoxGeometry(wrestlerWidth, wrestlerHeight, wrestlerDepth);
        const backMaterial = new THREE.MeshStandardMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const backMesh = new THREE.Mesh(backGeometry, backMaterial);
        backMesh.rotation.y = Math.PI / 12;  // 反対方向に角度をつける
        backMesh.position.x = 0.1;
        backMesh.castShadow = true;
        wrestlerGroup.add(backMesh);

        // 顔部分（小さい円）
        const faceGeometry = new THREE.CircleGeometry(0.3, 16);
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xffdbac,
            side: THREE.DoubleSide
        });
        const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        faceMesh.position.set(0, wrestlerHeight / 2 - 0.3, wrestlerDepth / 2 + 0.05);
        wrestlerGroup.add(faceMesh);

        // 髷（黒い円）
        const mageGeometry = new THREE.CircleGeometry(0.15, 8);
        const mageMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });
        const mageMesh = new THREE.Mesh(mageGeometry, mageMaterial);
        mageMesh.position.set(0, wrestlerHeight / 2, wrestlerDepth / 2 + 0.05);
        wrestlerGroup.add(mageMesh);

        wrestlerGroup.position.copy(position);
        this.scene.add(wrestlerGroup);

        // Cannon.js物理ボディ（くの字形状を三角柱で近似）
        // 底辺が線になるように、細長い三角形を使用
        const wrestlerShape = new CANNON.Box(
            new CANNON.Vec3(wrestlerWidth * 2, wrestlerHeight / 2, wrestlerDepth / 2)
        );
        const wrestlerBody = new CANNON.Body({
            mass: 0.3,  // 紙のように軽く
            material: this.wrestlerMaterial,
            linearDamping: 0.4,  // 空気抵抗を増やして安定化
            angularDamping: 0.6  // 回転抵抗を増やして倒れやすく
        });
        wrestlerBody.addShape(wrestlerShape);
        wrestlerBody.position.copy(position);

        // 重心を下に設定（底辺で接触しやすくする）
        wrestlerBody.shapeOffsets[0] = new CANNON.Vec3(0, 0, 0);

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // ディレクショナルライト（正面から）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 0, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // サイドライト（立体感を出す）
        const sideLight = new THREE.PointLight(0xffffff, 0.3);
        sideLight.position.set(5, 0, 5);
        this.scene.add(sideLight);
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
        const tiltAmount = 0.12; // 傾きの大きさ（ラジアン）

        switch(position) {
            case 'top-left':
                // 左上をタップ → 土俵を左上に傾ける（力士は右下に滑る）
                this.targetTilt.x = -tiltAmount;  // X軸：左に傾ける
                this.targetTilt.z = tiltAmount;   // Y軸：上に傾ける
                break;
            case 'top-right':
                // 右上をタップ → 土俵を右上に傾ける（力士は左下に滑る）
                this.targetTilt.x = tiltAmount;   // X軸：右に傾ける
                this.targetTilt.z = tiltAmount;   // Y軸：上に傾ける
                break;
            case 'bottom-left':
                // 左下をタップ → 土俵を左下に傾ける（力士は右上に滑る）
                this.targetTilt.x = -tiltAmount;  // X軸：左に傾ける
                this.targetTilt.z = -tiltAmount;  // Y軸：下に傾ける
                break;
            case 'bottom-right':
                // 右下をタップ → 土俵を右下に傾ける（力士は左上に滑る）
                this.targetTilt.x = tiltAmount;   // X軸：右に傾ける
                this.targetTilt.z = -tiltAmount;  // Y軸：下に傾ける
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
        // X軸の傾き（左右）
        const tiltQuatX = new CANNON.Quaternion();
        tiltQuatX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), this.dohyoTilt.x);

        // Y軸の傾き（上下）
        const tiltQuatY = new CANNON.Quaternion();
        tiltQuatY.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.dohyoTilt.z);

        // クォータニオンを合成
        this.dohyo.body.quaternion = tiltQuatY.mult(tiltQuatX);
    }

    checkWinConditions() {
        if (this.gameState !== 'playing') return;

        let activeWrestlers = 0;
        let winner = null;

        this.wrestlers.forEach(wrestler => {
            // 土俵から出たかチェック（矩形範囲）
            const halfWidth = this.dohyo.width / 2;
            const halfHeight = this.dohyo.height / 2;

            if (
                (Math.abs(wrestler.body.position.x) > halfWidth ||
                Math.abs(wrestler.body.position.y) > halfHeight) &&
                !wrestler.isOut
            ) {
                wrestler.isOut = true;
            }

            // 倒れたかチェック（Z軸の回転で判定）
            const rotation = wrestler.body.quaternion;
            const euler = new CANNON.Vec3();
            rotation.toEuler(euler);

            // Z軸の回転が大きい場合は倒れたと判定（横に倒れる）
            if (Math.abs(euler.z) > Math.PI / 3 && !wrestler.isDown) {
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

        // 力士の位置と状態をリセット（横視点に合わせた位置）
        this.wrestlers[0].body.position.set(-2.5, 0, 1);  // 左側
        this.wrestlers[0].body.velocity.set(0, 0, 0);
        this.wrestlers[0].body.angularVelocity.set(0, 0, 0);
        this.wrestlers[0].body.quaternion.set(0, 0, 0, 1);
        this.wrestlers[0].isOut = false;
        this.wrestlers[0].isDown = false;

        this.wrestlers[1].body.position.set(2.5, 0, 1);   // 右側
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
