'use strict'

// 設定
const REGION = 'ap-northeast-1';
const ENDPOINT = 'a1ejvh9cudga9l-ats.iot.ap-northeast-1.amazonaws.com';
const POOL_ID = 'ap-northeast-1:35271f64-bbfa-4157-a88f-a568c2c0cf61';
const TOPIC = 'kinuura/notes';

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

// AWS 初期設定
AWS.config.region = REGION;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: POOL_ID,
});

const resultsDiv = document.getElementById('results');  // 受信したメモを表示するエリア

// 接続処理
AWS.config.credentials.refresh((err) => {
    if (err) return console.error("認証失敗:", err);
    
    const creds = AWS.config.credentials;
    // console.log("AccessKey: OK. 接続を開始します...");

    // SDKの自動判別
    const IotSDK = window.AWSIoTData || window.AWSIot;
    if (!IotSDK) return console.error("SDKが読み込めていません");

    const device = IotSDK.device({
        host: ENDPOINT,
        protocol: 'wss',
        clientId: 'receiver-' + Math.random().toString(16).substr(2, 8),
        accessKeyId: creds.accessKeyId,
        secretKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        region: REGION
    });

    device.on('connect', () => {
        // console.log('★受信側：AWS IoT Coreに接続成功！');
        device.subscribe(TOPIC);
    });


    device.on('message', (topic, payload) => {
        const data = JSON.parse(payload.toString());
        if (!data.notes) return;

        const card = document.createElement("div");
        card.className = "card";

        const noteContent = document.createElement("div");
        noteContent.className = "card-notes";
        noteContent.textContent = data.notes;
        card.appendChild(noteContent);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = ICON_COPY;
        
        // ツールチップ用の属性をセット
        copyBtn.setAttribute('data-tooltip', 'コピー'); 

        copyBtn.onclick = () => {
            const textToCopy = data.notes;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(onError);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    onSuccess();
                } catch (err) {
                    onError(err);
                }
                document.body.removeChild(textArea);
            }

            function onSuccess() {
                copyBtn.innerHTML = ICON_CHECK;
                // ツールチップの文字も変える
                copyBtn.setAttribute('data-tooltip', 'コピー完了！'); 
                
                setTimeout(() => { 
                    copyBtn.innerHTML = ICON_COPY; 
                    copyBtn.setAttribute('data-tooltip', 'コピー'); 
                }, 2000);
            }
            function onError(err) { console.error("コピー失敗:", err); }
        };

        card.appendChild(copyBtn);
        if (resultsDiv) resultsDiv.prepend(card);
    });

    device.on('error', (e) => console.log('接続エラー:', e));
});