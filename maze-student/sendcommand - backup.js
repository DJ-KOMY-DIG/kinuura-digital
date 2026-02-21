// 2026/01/22 Daisuke Komori
// sendcommand.js

'use strict'

// Firebase SDKのインポート（モジュール版）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRrHyv_BrsJib_sc7uuGzAoFosbyy1DT8",
  authDomain: "digital-training-pa010.firebaseapp.com",
  databaseURL: "https://digital-training-pa010-default-rtdb.firebaseio.com",
  projectId: "digital-training-pa010",
  storageBucket: "digital-training-pa010.firebasestorage.app",
  messagingSenderId: "110190854767",
  appId: "1:110190854767:web:216cc1cac94ac6338f039a",
  measurementId: "G-Y9LNQEHJV1"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --------------------------------------------------
// student.html用の処理
// --------------------------------------------------
const sendBtn = document.getElementById('sendBtn');             // 送信ボタン
if (sendBtn) {
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

    cmdField.addEventListener('input', validateInput);          // 指示入力ボックスのinputイベント
    cmdField.addEventListener('blur', validateInput);           // 入力欄から離れた時も念のため実行

    // 送信ボタンのクリックイベントハンドラ
    sendBtn.addEventListener('click', () => {
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

        // データ送信
        push(ref(db, 'answers'), {
            name: nameVal,
            command: cmdVal,
            timestamp: serverTimestamp()
        }).then(() => {
            showAlert("迷路指示", "送信しました！", "success");
            // 送信後に入力欄をクリア
            // cmdField.value = ""; 

        }).catch((error) => {
            console.error("Error:", error);
            showAlert("迷路指示", "送信に失敗しました", "error");
        });
    });
}

// --------------------------------------------------
// instructor.html用の処理
// --------------------------------------------------

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

const resultsDiv = document.getElementById('results');  // 指示表示用div
if (resultsDiv) {
    const answersRef = ref(db, 'answers');
    
    // データが追加された場合の処理
    onChildAdded(answersRef, (snapshot) => {
        const data = snapshot.val();
        if (!data.name || !data.command) return;    // 値がない場合は抜ける
        const card = document.createElement("div"); // データカード作成
        card.className = "card";

        // テキスト部分の作成
        // innerHTMLを使わず、divを作って textContent に代入することで
        // 自動的に安全に表示され、かつバッククォート等でのエラーも防げる
        // const nameContent = document.createElement("div");
        // nameContent.className = "card-name";
        // nameContent.textContent = data.name; // ここで生のデータを入れる（自動エスケープされる）
        // card.appendChild(nameContent);

        // 安全のためにHTMLエスケープ（HTMLタグが入力された場合の安全策）
        // サニタイズ（不正な文字を安全な文字に置き換え）
        // 簡易的なXSS（クロスサイトスクリプティング）攻撃対策として textContent を使うのも可
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
    });

    // リセットボタンの処理
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'データをすべて消去しますか？',
                text: "この操作は取り消せません！",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: '削除します',
                cancelButtonText: 'キャンセル'
            }).then((result) => {
                if (result.isConfirmed) {
                    remove(ref(db, 'answers'))
                        .then(() => {
                            location.reload();
                        })
                        .catch((error) => {
                            console.error(error);
                            showAlert("エラー", "リセットに失敗しました", "error");
                        });
                }
            });
        });
    }
}

