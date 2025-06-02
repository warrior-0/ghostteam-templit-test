// auth.js : 로그인/로그아웃 UI 및 상태 관리 공통 모듈

function isLoggedIn() {
  return localStorage.getItem('loggedIn') === 'true';
}

function getPrevPage() {
  // 로그인 전 이동했던 페이지 기억
  return localStorage.getItem('prevPage') || 'index.html';
}

function setPrevPage(url) {
  localStorage.setItem('prevPage', url);
}

function goToLogin() {
  setPrevPage(window.location.href);
  window.location.href = 'login.html';
}

function logoutUser() {
  localStorage.removeItem('loggedIn');
  alert('로그아웃 되었습니다.');
  location.reload();
}

function renderAuthButton() {
  // 음악 버튼 옆에 로그인/로그아웃 버튼 추가
  let btnWrapper = document.getElementById('bgmToggleContainer');
  if (!btnWrapper) return;

  let existing = document.getElementById('authBtn');
  if (existing) existing.remove();

  const authBtn = document.createElement('button');
  authBtn.id = 'authBtn';
  authBtn.style.marginLeft = '0.7rem';
  authBtn.style.background = '#222';
  authBtn.style.color = '#fafafa';
  authBtn.style.border = 'none';
  authBtn.style.padding = '0.4rem 1rem';
  authBtn.style.borderRadius = '20px';
  authBtn.style.fontSize = '0.95rem';
  authBtn.style.cursor = 'pointer';
  authBtn.style.transition = 'background 0.2s';

  if (isLoggedIn()) {
    authBtn.textContent = '로그아웃';
    authBtn.onclick = logoutUser;
  } else {
    authBtn.textContent = '로그인';
    authBtn.onclick = goToLogin;
  }

  btnWrapper.appendChild(authBtn);
}

// 페이지가 로드될 때마다 auth 버튼 렌더링
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(renderAuthButton, 0);
});
