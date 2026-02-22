// 2026/02/22 Daisuke Komori
// sendcommand.js

'use strict'

const REGION = 'ap-northeast-1';
const ENDPOINT = 'a1ejvh9cudga9l-ats.iot.ap-northeast-1.amazonaws.com';
const POOL_ID = 'ap-northeast-1:35271f64-bbfa-4157-a88f-a568c2c0cf61';
const TOPIC = 'maze/instructions';

AWS.config.region = REGION;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: POOL_ID,
});

// 鍵を取得
AWS.config.credentials.refresh((err) => {
    if (err) return console.error("認証失敗:", err);
    console.log("AccessKey: OK! 送信準備完了");

    // AWS.IotData を使って送信機を作成
    const iotdata = new AWS.IotData({
        endpoint: ENDPOINT
    });

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {

        // 送信ボタンのクリックイベント
        sendBtn.onclick = () => {
            const cmdField = document.getElementById('inputCommand');   // 指示入力ボックス

            // 入力制限のロジック
            // 日本語入力中などを考慮し、inputイベントで監視
            const validateInput = (e) => {        
                const val = e.target.value;                             // 現在の入力値        
                const cleanVal = val.replace(/[^fFrRlL]/g, '');         // F,R,L (大文字小文字) 以外を空文字に置換
                
                // 変化があった場合のみ値を書き換える（無限ループ防止）
                if (val !== cleanVal.toUpperCase()) {
                    e.target.value = cleanVal.toUpperCase();
                }
            };

            const nameField = document.getElementById('inputName');
            const nameVal = nameField.value.trim();
            const cmdVal = cmdField.value.toUpperCase().trim();     // 大文字化
            
            if (!nameVal) {
                // alertではなく、SweetAlert2でメッセージ表示
                showAlert("迷路指示", "名前を入力してください！", "warning");
                return;
            }
            if (!cmdVal) {
                showAlert("迷路指示", "指示（F、R、L）を入力してください！", "warning");
                return;
            }

            const params = {
                topic: TOPIC,
                payload: JSON.stringify({
                    userName: nameVal,
                    commands: cmdVal,
                    timestamp: Date.now()
                }),
                qos: 0
            };

            // 直接 Publish（HTTP経由なので安定）
            iotdata.publish(params, (err, data) => {
                if (err) {
                    console.error("送信エラー:", err);
                    showAlert("迷路指示", "送信に失敗しました", "error");
                } else {
                    console.log("回答を送信しました！");
                    showAlert("迷路指示", "送信しました！", "success");
                }
            });
        };
    }
});



