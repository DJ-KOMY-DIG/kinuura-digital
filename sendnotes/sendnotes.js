'use strict'

const REGION = 'ap-northeast-1';
const ENDPOINT = 'a1ejvh9cudga9l-ats.iot.ap-northeast-1.amazonaws.com';
const POOL_ID = 'ap-northeast-1:35271f64-bbfa-4157-a88f-a568c2c0cf61';
const TOPIC = 'kinuura/notes';

AWS.config.region = REGION;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: POOL_ID,
});

// 鍵を取得
AWS.config.credentials.refresh((err) => {
    if (err) return console.error("認証失敗:", err);
    console.log("AccessKey: OK! 送信準備完了");

    // すでに見えている AWS.IotData を使って送信機を作成
    const iotdata = new AWS.IotData({
        endpoint: ENDPOINT
    });

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = () => {
            const noteVal = document.getElementById('inputNotes').value;
            if (!noteVal) return;

            const params = {
                topic: TOPIC,
                payload: JSON.stringify({ notes: noteVal, timestamp: Date.now() }),
                qos: 0
            };

            // 直接 Publish（HTTP経由なので安定）
            iotdata.publish(params, (err, data) => {
                if (err) {
                    console.error("送信失敗:", err);
                } else {
                    // console.log("送信成功！:", noteVal);
                    document.getElementById('inputNotes').value = "";
                }
            });
        };
    }
});
