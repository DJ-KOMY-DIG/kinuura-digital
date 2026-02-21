// HTML側でタグ要
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
// <script src="message.js"></script>

'use strict';

// icon: success, error, warning, info, question
function showAlert(title, text, icon) {
  Swal.fire({
    title: title,
    text: text,
    icon: icon, // success, error, warning, info, question
    confirmButtonText: 'OK',
    confirmButtonColor: '#3085d6'
  });
}

// windowオブジェクトに登録することで、モジュール内から呼べるようにする
window.showAlert = showAlert;
