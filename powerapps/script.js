// 2026/01 Daisuke Komori

'use strict';

const appsLink = document.getElementById("apps");
const onedriveLink = document.getElementById('onedrive');
const notesLink = document.getElementById('notes');

appsLink.addEventListener('click', (e) => {
    console.log('Power Apps link clicked');
    e.preventDefault();
    // 新しいウィンドウで開く
    window.open('https://make.powerapps.com/', 'Power Apps', 'width=1920, height=1080, noopener');
    return false;
});

onedriveLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://toyotajp-my.sharepoint.com/', 'OneDrive','width=1920, height=1080, noopener');
    return false;
});

notesLink.addEventListener('click', (e) => {
    e.preventDefault();
    // window.open('https://dj-komy-dig.github.io/sendnotes/receive.html', 'Receive Notes','width=1400, height=1000, noopener');
    window.open('http://kinuura-digital-receivenotes.s3-website-ap-northeast-1.amazonaws.com', 'Receive Notes','width=1400, height=1000, noopener');
    return false;
});
