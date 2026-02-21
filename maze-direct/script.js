// 2025/12/28 Daisuke Komori

'use strict';

// 定数定義
const AISLE = 0;      // 通路 (白)
const FLG_START = 1;  // スタート
const FLG_GOAL = 2;   // ゴール
const WALL = 3;       // 壁 (黒)
const PATH = 8;       // 正解ルート (緑)

// 色設定
const COLORS = {
    [AISLE]: '#FFFFFF', 
    [WALL]: '#000000',
    [FLG_START]: '#15ff00', 
    [FLG_GOAL]: '#0000FF',
    [PATH]: '#00FF00'
};

// グローバル変数
let maze = [];              // 2D配列で迷路データを保持
let rows = 0;               // 行数
let cols = 0;               // 列数
let cellSize = 0;           // セルのサイズ（ピクセル）
let isAnimating = false;    // アニメーション中フラグ

let itvlIdBomb;             // Bomb Interval ID
let itvlIdClear;            // Clear Bomb Interval ID

const CANVAS_SIZE = 600;    // キャンバスの固定サイズ

// DOM要素
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const btnCreate = document.getElementById('btnCreate');
const inputGridSize = document.getElementById('gridSize');
const rangeSpeed = document.getElementById('speedRange');
const rangeBranch = document.getElementById('branchRate');
const inputCommand = document.getElementById('commandInput');
const btnClear = document.getElementById('btnClear');
const btnCommand = document.getElementById('btnCommand');
const btnReset = document.getElementById('btnReset'); 

// 初期化イベント
window.onload = () => {
    createMaze();
    btnClear.onclick = clearCommand;    
    btnCreate.onclick = createMaze;
    btnCommand.onclick = runCommandMaze;
    btnReset.onclick = resetMazePath;
    inputCommand.focus(); 
    initialize();
};

// 迷路作成
function createMaze() {
    initialize();                               // Bomb停止
    if (isAnimating) return;                    // アニメーション中は無効
    inputCommand.value = "";                    // 指示入力欄をクリア
    let val = parseInt(inputGridSize.value);    // グリッドサイズ取得
    if (val % 2 === 0) val += 1;                // 偶数なら奇数に調整
    
    rows = val;                     // 行数
    cols = val;                     // 列数
    cellSize = CANVAS_SIZE / rows;  // セルサイズ

    const branchRate = parseInt(rangeBranch.value) / 100;   // 分岐率 (0.0 - 1.0)   

    // すべて壁にする
    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = WALL;
        }
    }

    let activeCells = [];
    const startY = 1;
    const startX = 1;
    maze[startY][startX] = AISLE;               // スタート地点を通路に
    activeCells.push({y: startY, x: startX});   // アクティブセルリストに追加

    // 探索方向の定義 (上下左右)
    const directions = [
        { dy: -2, dx: 0 },
        { dy: 2, dx: 0 }, 
        { dy: 0, dx: -2 },
        { dy: 0, dx: 2 } 
    ];

    // メインループ
    while (activeCells.length > 0) {
        let index;
        if (Math.random() < branchRate) {
            index = Math.floor(Math.random() * activeCells.length); // ランダム選択
        } else {
            index = activeCells.length - 1; // 最後のセル選択（深さ優先）
        }
        
        const cell = activeCells[index];
        const cy = cell.y;
        const cx = cell.x;

        shuffleArray(directions);   // 探索方向をシャッフル

        let found = false;

        for (let i = 0; i < directions.length; i++) {
            const ny = cy + directions[i].dy;   // 新しいyセルの座標
            const nx = cx + directions[i].dx;   // 新しいxセルの座標

            if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                if (maze[ny][nx] === WALL) {
                    const wallY = cy + directions[i].dy / 2;    // 壁yの座標
                    const wallX = cx + directions[i].dx / 2;    // 壁xの座標
                    maze[wallY][wallX] = AISLE;                 // 壁を通路に
                    maze[ny][nx] = AISLE;                       // 新しいセルを通路に

                    activeCells.push({ y: ny, x: nx });         // アクティブセルリストに追加
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            activeCells.splice(index, 1);   // アクティブセルリストから削除 
        }
    }

    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;

    drawMaze();         // 迷路描画    
    drawStartArrow();   // 作成時にスタート地点の矢印を表示

}

// スタート地点の初期矢印を描画
function drawStartArrow() {
    // スタート地点
    const cy = 1;
    const cx = 1;
    
    // 方向: 0:上, 1:右, 2:下, 3:左
    const dy = [-1, 0, 1, 0];
    const dx = [0, 1, 0, -1];
    
    let dir = 1; // デフォルト右

    // 右が壁で、下が壁でなければ下向きスタート
    if (maze[cy + dy[1]][cx + dx[1]] === WALL && maze[cy + dy[2]][cx + dx[2]] !== WALL) {
        dir = 2; // 下
    }

    drawArrow(cy, cx, dir);
}

function clearCommand() {
    inputCommand.value = "";
}

// 指示を実行
async function runCommandMaze() {
    initialize();               // Bomb停止
    if (isAnimating) return;    // アニメーション中は無効
    resetMazePath();            // リセット
    isAnimating = true;         // アニメーション中フラグセット
    disableControls();          // コントロール無効化

    const commands = inputCommand.value.toUpperCase().trim();   // 指示取得

    // 入力がない場合
    if (!commands) {
        // alert("指示を入力してください！");
        showAlert("迷路指示", "指示を入力してください！", "warning");
        enableControls();
        return;
    }

    // 方向: 0:上, 1:右, 2:下, 3:左
    const dy = [-1, 0, 1, 0];
    const dx = [0, 1, 0, -1];

    let cy = 1;
    let cx = 1;
    let dir = 1; // デフォルト右

    // 初期向きの決定
    if (maze[cy + dy[1]][cx + dx[1]] === WALL && maze[cy + dy[2]][cx + dx[2]] !== WALL) {
        dir = 2; // 下
    }
    
    // 現在地と矢印を描画
    maze[cy][cx] = PATH;
    drawCell(cy, cx);       // スタート地点を描画
    drawArrow(cy, cx, dir); // 矢印描画

    // 指示実行ループ
    for (let i = 0; i < commands.length; i++) {
        const char = commands[i];        
        const speed = parseInt(rangeSpeed.value);
        const waitTime = Math.max(0, 100 - speed);
        
        if (waitTime > 0) await sleep(waitTime * 5); // アニメーション待機 

        // 次の向きを決定
        let nextDir = dir;
        
        if (char === 'F') {            
            nextDir = dir;              // 向きはそのまま
        } else if (char === 'R') {            
            nextDir = (dir + 1) % 4;    // 右に90度
        } else if (char === 'L') {            
            nextDir = (dir + 3) % 4;    // 左に90度
        } else {            
            continue;                   // F, R, L 以外はスキップ
        }

        // 向きを更新 (移動前に向きを変える)
        dir = nextDir;

        // その方向へ進む座標を計算
        const ny = cy + dy[dir];
        const nx = cx + dx[dir];

        // 移動チェック
        if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
            if (maze[ny][nx] !== WALL) {    // 通路へ移動

                // 移動前のマスの矢印を消去（色を塗り直す）
                drawCell(cy, cx);

                // 座標更新
                cy = ny;
                cx = nx;
                
                // 通路の色塗り
                if (maze[cy][cx] !== FLG_GOAL) {
                    maze[cy][cx] = PATH;
                }
                
                // 移動先を描画
                drawCell(cy, cx);

                // 新しい位置・向きで矢印を描画
                drawArrow(cy, cx, dir);

                // ゴール判定
                if (cy === rows - 2 && cx === cols - 2) {
                    await sleep(100);
                    // alert("ゴールに到達しました！");
                    showAlert("迷路指示", "ゴールに到達しました！", "success");
                    itvlIdBomb = setInterval(showBomb, 1000);            // Bomb
                    itvlIdClear = setInterval(clearBomb, 1000 * 5);      // Clear Bomb
                    break; 
                }
            } else {

                // 壁に衝突した時点の向きで矢印を再描画（回転は反映させる）
                drawCell(cy, cx); // 一度クリア
                drawArrow(cy, cx, dir); 
                
                // alert(i + "文字目の指示「" + char + "」で壁に衝突しました！");
                showAlert("迷路指示", (i + 1) + "文字目の指示「" + char + "」で壁に衝突しました！", "error");
                break;
            }
        }
    }

    enableControls();
}

// 矢印描画
function drawArrow(y, x, dir) {
    const cx = x * cellSize + cellSize / 2; 
    const cy = y * cellSize + cellSize / 2; 
    const size = cellSize * 0.6; 

    ctx.save(); 
    ctx.translate(cx, cy); 
    
    // 0:Up, 1:Right, 2:Down, 3:Left
    // Canvas 0rad = Right(3 o'clock). 
    // dir=0(Up) -> -90deg
    const rotation = (dir * 90 - 90) * (Math.PI / 180); // ラジアン変換
    ctx.rotate(rotation);   // 回転

    // 三角形の描画
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);          
    ctx.lineTo(-size / 2, -size / 2); 
    ctx.lineTo(-size / 2, size / 2);  
    ctx.closePath();

    ctx.fillStyle = '#FF00FF'; 
    ctx.fill();

    ctx.restore(); 
}

// リセット処理
function resetMazePath() {
    initialize();
    if (isAnimating) return;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (maze[y][x] === PATH) {
                maze[y][x] = AISLE;
            }
        }
    }
    
    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;

    drawMaze();         // 迷路再描画
    drawStartArrow();   // 矢印表示
}

// コントロールの無効化
function disableControls() {
    btnCreate.disabled = true;
    btnCommand.disabled = true;
}

// コントロールの有効化
function enableControls() {
    isAnimating = false;
    btnCreate.disabled = false;
    btnCommand.disabled = false;
}

// 迷路描画
function drawMaze() {
    ctx.fillStyle = COLORS[WALL];
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            drawCell(y, x);
        }
    }
}

// セル描画
function drawCell(y, x) {
    const type = maze[y][x];
    let color = COLORS[type] || '#FFFFFF';

    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

    if (type !== WALL) {
        ctx.strokeStyle = '#CCCCCC'; 
        ctx.lineWidth = 1;           
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
}

// 配列シャッフル
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// スリープ関数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showBomb() {
//   confetti();                     // Simple
  confetti({                         // Bomb!
    particleCount: 100,
    spread: 70
  });
}

function clearBomb() {
  clearInterval(itvlIdBomb);
}

function initialize() {
    clearInterval(itvlIdBomb);  // Bomb停止
    clearInterval(itvlIdClear); // Clear Bomb停止
}