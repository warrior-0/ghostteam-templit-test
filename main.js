// main.js - 드롭다운 메뉴 및 홈 슬라이더, BGM 토글 (기존 유지)
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

  // 이하 기존 슬라이더, BGM 토글 코드 동일...
  // (불필요한 부분 생략 가능)
});
