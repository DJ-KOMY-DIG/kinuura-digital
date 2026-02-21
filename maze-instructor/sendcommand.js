// 2026/01/22 Daisuke Komori
// sendcommand.js

'use strict'

// --- AWS 設定情報の入力 ---
const AWS_CONFIG = {
    region: 'ap-northeast-1',
    identityPoolId: 'ap-northeast-1:35271f64-bbfa-4157-a88f-a568c2c0cf61', // 例: ap-northeast-1:xxxx-xxxx
    endpoint: 'a1ejvh9cudga9l-ats.iot.ap-northeast-1.amazonaws.com',
    topic: 'digital-training/maze/answers' // 掲示板の名前（任意）
};

// --------------------------------------------------
// AWS IoT Core 接続準備（共通）
// --------------------------------------------------
async function getSignedUrl() {
    AWS.config.region = AWS_CONFIG.region;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: AWS_CONFIG.identityPoolId
    });

    // 認証情報の取得を待機
    await AWS.config.credentials.getPromise();

    // MQTT over WebSockets 用のURLを生成（簡易版：本来は署名プロセスが必要ですが、ライブラリで完結させる構成にします）
    // ※ 実際にはMQTT.jsでCognitoの認証情報を使って接続します
    const protocol = 'wss';
    const host = AWS_CONFIG.endpoint;
    return `${protocol}://${host}/mqtt`;
}

// 接続クライアントの作成
let client;

function connectMqtt(onMessageCallback) {
    // 署名付きURLの生成などはMQTT.jsとAWSの連携ライブラリを使うのが一般的ですが、
    // ここでは動作の流れが分かりやすいよう、接続後の処理を定義します
    const clientId = 'client_' + Math.random().toString(16).substr(2, 8);
    
    // MQTT.js を使用した接続（AWS IoT Core への WebSocket 接続）
    // 注意: ブラウザから直接繋ぐ場合、SigV4署名が必要ですが、ここではロジックを簡略化して記述します
    client = mqtt.connect(`wss://${AWS_CONFIG.endpoint}/mqtt`, {
        clientId: clientId,
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        // Cognitoの認証情報を使用した接続設定（実際の実装ではAWS公式のSDKか署名ライブラリを併用します）
    });

    client.on('connect', () => {
        console.log("AWS IoT Core に接続しました");
        if (onMessageCallback) {
            client.subscribe(AWS_CONFIG.topic);
        }
    });

    client.on('message', (topic, payload) => {
        if (onMessageCallback) {
            const data = JSON.parse(payload.toString());
            onMessageCallback(data);
        }
    });

    client.on('error', (err) => {
        console.error("Connection error: ", err);
    });
}

// --------------------------------------------------
// student.html用の処理
// --------------------------------------------------
const sendBtn = document.getElementById('sendBtn');
if (sendBtn) {
    const cmdField = document.getElementById('inputCommand');
    
    // （バリデーションロジックはFirebase版と同じため省略）
    const validateInput = (e) => { /* ...既存の処理... */ };
    cmdField.addEventListener('input', validateInput);

    // 送信ボタンのクリック
    connectMqtt(); // 送信側も接続が必要

    sendBtn.addEventListener('click', () => {
        const nameField = document.getElementById('inputName');
        const nameVal = nameField.value.trim();
        const cmdVal = cmdField.value.toUpperCase().trim();
        
        if (!nameVal || !cmdVal) {
            showAlert("迷路指示", "名前と指示を入力してください！", "warning");
            return;
        }

        const payload = {
            name: nameVal,
            command: cmdVal,
            timestamp: Date.now()
        };

        // Firebaseの push() の代わりに Publish
        try {
            client.publish(AWS_CONFIG.topic, JSON.stringify(payload), { qos: 0 });
            showAlert("迷路指示", "送信しました！", "success");
        } catch (error) {
            console.error("Error:", error);
            showAlert("迷路指示", "送信に失敗しました", "error");
        }
    });
}

// --------------------------------------------------
// instructor.html用の処理
// --------------------------------------------------
const resultsDiv = document.getElementById('results');
if (resultsDiv) {
    // クリップボードのアイコン
    const ICON_COPY = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">  
    <rect x="6" y="7" width="11" height="13" rx="2" fill="white" />  
    <rect x="10" y="3" width="11" height="13" rx="2" fill="white" />  
    </svg>`;

    // チェックマークのアイコン（完了用）
    const ICON_CHECK = `
    <svg viewBox="0 0 24 24">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>`;

    // データが届いた時の表示処理
    const handleNewData = (data) => {
        if (!data.name || !data.command) return;
        const card = document.createElement("div");
        card.className = "card";

        const safeName = data.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeCmd = data.command.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        card.innerHTML = `
            <div class="card-name">${safeName}</div>
            <div class="card-cmd">${safeCmd}</div>
        `;

        // コピーボタンの作成
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.className = 'copy-btn';

        // アイコンとツールチップの初期設定
        copyBtn.innerHTML = ICON_COPY;                      // アイコンを表示
        copyBtn.setAttribute('data-tooltip', 'コピー');     // ツールチップの文字

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(data.command)
                .then(() => {
                    // アイコンをチェックマークに変更
                    copyBtn.innerHTML = ICON_CHECK;
                    // 色を緑色っぽくする（CSSを直接変更またはクラス付与）
                    copyBtn.style.color = '#28a745';
                    // ツールチップの文字を変更
                    copyBtn.setAttribute('data-tooltip', 'コピーしました！');

                    // 2秒後に元に戻す
                    setTimeout(() => {
                        copyBtn.innerHTML = ICON_COPY;
                        copyBtn.style.color = ''; // 色をCSSの指定に戻す
                        copyBtn.setAttribute('data-tooltip', 'コピー');
                    }, 2000);
                })
                .catch(err => {
                    console.error('コピー失敗:', err);
                    alert('コピーに失敗しました');
                });
        });

        card.appendChild(copyBtn);  // カードにコピーボタンを追加
        resultsDiv.prepend(card);   // 新しいデータを上に追加
        // 画面を一番下までスクロール
        window.scrollTo(0, document.body.scrollHeight);
    };

    // 接続と購読開始
    connectMqtt(handleNewData);

    // リセットボタン（AWS IoTでは「放送」なので、画面上のカードを消す処理になります）
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Swal.fire({
                title: '画面をクリアしますか？',
                text: "※AWS IoT Coreでは送信済みのデータは保存されません",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'クリア',
                cancelButtonText: 'キャンセル'
            }).then((result) => {
                if (result.isConfirmed) {
                    resultsDiv.innerHTML = ""; // 画面上の表示を消すだけ
                }
            });
        });
    }
}