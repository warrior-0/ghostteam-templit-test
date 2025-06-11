import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAjHwHbHlCi4vgv-Ma0-3kqt-M3SLI_oF4",
  authDomain: "ghost-38f07.firebaseapp.com",
  projectId: "ghost-38f07",
  storageBucket: "ghost-38f07.appspot.com",
  messagingSenderId: "776945022976",
  appId: "1:776945022976:web:105e545d39f12b5d0940e5",
  measurementId: "G-B758ZC971V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ 모든 DOM 로딩 후 실행
document.addEventListener('DOMContentLoaded', function () {

  // 드롭다운 메뉴
  function setupDropdownMenus() {
    ['urbanMenu', 'communityMenu', 'aboutMenu'].forEach(menuId => {
      const menuLi = document.getElementById(menuId);
      if (menuLi) {
        const submenu = menuLi.querySelector('.submenu');
        const dropdown = menuLi.querySelector('.dropdown');
        let closeTimer = null;

        function openMenu() {
          clearTimeout(closeTimer);
          menuLi.classList.add('show-submenu');
          if (dropdown) dropdown.classList.add('open');
        }

        function closeMenu() {
          closeTimer = setTimeout(() => {
            menuLi.classList.remove('show-submenu');
            if (dropdown) dropdown.classList.remove('open');
          }, 350);
        }

        if (dropdown && submenu) {
          dropdown.addEventListener('mouseenter', openMenu);
          dropdown.addEventListener('focus', openMenu);
          menuLi.addEventListener('mouseleave', closeMenu);
          menuLi.addEventListener('mouseenter', openMenu);
          submenu.addEventListener('mouseenter', openMenu);
          submenu.addEventListener('mouseleave', closeMenu);
          dropdown.addEventListener('blur', closeMenu);
        }
      }
    });
  }

  setupDropdownMenus();

  // BGM 버튼 삽입
  const headerInner = document.querySelector('.header-inner');
  if (headerInner && !document.getElementById('bgmToggleContainer')) {
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'bgm-header-control';
    btnWrapper.id = 'bgmToggleContainer';
    btnWrapper.innerHTML = `<button id="bgmToggleBtn">🎵 <span id="bgmStatus">OFF</span></button>`;
    headerInner.appendChild(btnWrapper);
  }

  // 로그인/로그아웃 버튼 삽입
  if (headerInner && !document.getElementById('authBtnContainer')) {
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'bgm-header-control';
    btnWrapper.id = 'authBtnContainer';
    btnWrapper.innerHTML = `<button id="authBtn">로그인</button>`;
    headerInner.appendChild(btnWrapper);
  }

  const authBtn = document.getElementById('authBtn');

  // 로그인 상태에 따라 버튼 텍스트 변경
  onAuthStateChanged(auth, user => {
    if (user && authBtn) {
      authBtn.textContent = '로그아웃';
    } else if (authBtn) {
      authBtn.textContent = '로그인';
    }
  });

  // 로그인/로그아웃 버튼 클릭 이벤트
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      const currentPath = window.location.pathname + window.location.search;
      if (authBtn.textContent.includes('로그아웃')) {
        signOut(auth).then(() => {
          localStorage.removeItem('loggedInUser');
          alert('로그아웃되었습니다.');
          location.reload();
        });
      } else {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        window.location.href = 'login.html';
      }
    });
  }

  // 시작하기 버튼 → 슬라이더로 스크롤
  const heroActionBtn = document.getElementById('heroActionBtn');
  if (heroActionBtn) {
    heroActionBtn.addEventListener('click', () => {
      const target = document.getElementById('homeSlider');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // BGM 오디오 태그 삽입
  if (!document.getElementById('bgmAudio')) {
    const audioEl = document.createElement('audio');
    audioEl.id = 'bgmAudio';
    audioEl.loop = true;
    audioEl.innerHTML = `<source src="/audio/bgm.mp3" type="audio/mpeg">브라우저가 오디오를 지원하지 않습니다.`;
    document.body.appendChild(audioEl);
  }

  const bgmBtn = document.getElementById('bgmToggleBtn');
  const bgmAudio = document.getElementById('bgmAudio');
  const bgmStatusText = document.getElementById('bgmStatus');

  if (bgmBtn && bgmAudio && bgmStatusText) {
    let isPlaying = localStorage.getItem('bgmStatus') === 'on';

    function updateState(play) {
      if (play) {
        bgmAudio.play().catch(() => {});
        bgmStatusText.textContent = 'ON';
        localStorage.setItem('bgmStatus', 'on');
      } else {
        bgmAudio.pause();
        bgmStatusText.textContent = 'OFF';
        localStorage.setItem('bgmStatus', 'off');
      }
    }

    updateState(isPlaying);

    bgmBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      updateState(isPlaying);
    });
  }
});
