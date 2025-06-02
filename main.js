// ✅ main.js: 드롭다운 메뉴 + 홈 슬라이더

document.addEventListener('DOMContentLoaded', function () {
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

  // 홈 인기 괴담 슬라이더
  // ......[생략]...... (기존 슬라이더 코드 유지)

  // BGM 버튼 등 기존 코드 유지

  // 로그인/로그아웃 버튼은 firebase.js에서 자동 렌더됨
  // 모든 페이지 header에 <div id="authControl" style="margin-left:auto"></div>가 있어야 함
});
