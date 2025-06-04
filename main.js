// ✅ main.js: 드롭다운 메뉴 + 홈 슬라이더 + 로그인/로그아웃 버튼 + BGM 제어 + 시작하기 버튼 스크롤

document.addEventListener('DOMContentLoaded', function () {
  // 드롭다운 메뉴 초기화
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

  // 🎵 BGM 버튼 삽입
  const headerInner = document.querySelector('.header-inner');
  if (headerInner && !document.getElementById('bgmToggleContainer')) {
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'bgm-header-control';
    btnWrapper.id = 'bgmToggleContainer';
    btnWrapper.innerHTML = `
      <button id="bgmToggleBtn">🎵 <span id="bgmStatus">OFF</span></button>
    `;
    headerInner.appendChild(btnWrapper);
  }

  // 🔐 로그인 버튼 삽입
  if (headerInner && !document.getElementById('authBtnContainer')) {
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'bgm-header-control';
    btnWrapper.id = 'authBtnContainer';
    btnWrapper.innerHTML = `
      <button id="authBtn">🔐 로그인</button>
    `;
    headerInner.appendChild(btnWrapper);
  }

  // 🔐 로그인/로그아웃 버튼 동작
  const authBtn = document.getElementById('authBtn');
  const savedUser = localStorage.getItem('loggedInUser');
  if (savedUser && authBtn) {
    authBtn.textContent = '🔓 로그아웃';
  }
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      const currentPath = window.location.pathname;
      if (authBtn.textContent.includes('로그아웃')) {
        localStorage.removeItem('loggedInUser');
        alert('로그아웃되었습니다.');
        location.reload();
      } else {
        sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
        window.location.href = 'login.html';
      }
    });
  }

  // ✅ 시작하기 버튼 → 인기 괴담 슬라이더로 스크롤
  const heroActionBtn = document.getElementById('heroActionBtn');
  if (heroActionBtn) {
    heroActionBtn.addEventListener('click', () => {
      const target = document.getElementById('homeSlider');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // 🎵 BGM 오디오 태그 삽입
  if (!document.getElementById('bgmAudio')) {
    const audioEl = document.createElement('audio');
    audioEl.id = 'bgmAudio';
    audioEl.loop = true;
    audioEl.innerHTML = `<source src="bgm.mp3" type="audio/mpeg">브라우저가 오디오를 지원하지 않습니다.`;
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

  // 홈 인기 괴담 슬라이더
  const urbanData = [
    {
      id: 1,
      title: '밤길에 들리는 발소리',
      likes: 13,
      date: '2025-05-20',
      filter: 'korea',
      level: 3,
      thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
      body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분에 뒤를 돌아봤지만 아무도 없었다. 하지만 발소리는 점점 가까워졌다...',
      detail: '이 이야기는 실제로 2021년 서울의 한 골목에서 벌어진 일입니다. 집에 가던 중, 뒤에서 발소리가 가까워지는 것을 느꼈지만 주위를 둘러봐도 [...]'
    },
    {
      id: 2,
      title: '학교의 괴담',
      likes: 25,
      date: '2025-05-18',
      filter: 'korea',
      level: 2,
      thumb: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
      body: '우리 학교에는 밤마다 혼자 남아 있으면 들린다는 피아노 소리에 대한 소문이 있다. 실제로 경험한 친구의 이야기를 들었다...',
      detail: '실제로 친구는 늦게까지 교실에 남아 있었는데, 아무도 없는 음악실에서 피아노 소리가 났다고 합니다. 용기를 내어 가봤지만, 음악실에는 [...]'
    },
    {
      id: 3,
      title: '기묘한 아파트 엘리베이터',
      likes: 9,
      date: '2025-05-21',
      filter: 'foreign',
      level: 4,
      thumb: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3f41?auto=format&fit=crop&w=400&q=80',
      body: '엘리베이터에 홀로 타고 있는데, 누군가 버튼을 누른 것도 아닌데 갑자기 13층에 멈췄다. 문이 열리고 아무도 없었다...',
      detail: '엘리베이터를 타고 가던 중, 목적지와는 전혀 상관없는 13층에서 멈췄고, 문이 열렸지만 아무도 없었습니다. 괜히 오싹해서 바로 닫힘 버튼을 [...]'
    },
    {
      id: 4,
      title: '실제로 겪은 이야기',
      likes: 18,
      date: '2025-05-19',
      filter: 'true',
      level: 5,
      thumb: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80',
      body: '이 이야기는 실제로 내가 겪은 일이다...',
      detail: '어릴 적 시골집에서 혼자 잠을 자는데 누군가 이불을 잡아당기는 느낌이 들었습니다. 눈을 떠보니 아무도 없었고, 이불은 그대로였습니다. [...]'
    },
    {
      id: 5,
      title: '사용자 제보 괴담',
      likes: 11,
      date: '2025-05-17',
      filter: 'user',
      level: 1,
      thumb: 'https://images.unsplash.com/photo-1510936111840-6cef99faf2a9?auto=format&fit=crop&w=400&q=80',
      body: '이 괴담은 사용자에게 제보받은 내용입니다...',
      detail: '사용자 제보에 따르면, 한밤중에 집에서 혼자 있는데 누군가 문을 두드리는 소리가 들렸다고 합니다. 하지만 확인해보니 아무도 없었다고 합니다.'
    }
  ];

  const slider = document.getElementById('homeSlider');
  if (slider) {
    const sorted = [...urbanData].sort((a, b) => b.likes - a.likes).slice(0, 5);
    slider.innerHTML = sorted.map(item => `
      <div class="product-card" data-id="${item.id}">
        <img src="${item.thumb}" alt="${item.title}" />
        <div class="product-title">${item.title}</div>
        <div class="rating">${'★'.repeat(item.level)}${'☆'.repeat(5 - item.level)}</div>
        <div class="product-price">좋아요 ${item.likes}개</div>
      </div>
    `).join('');

    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        window.location.href = `urban.html?id=${id}`;
      });
    });

    let idx = 0;
    const visible = 2.3;

    function updateSlider() {
      const card = slider.querySelector('.product-card');
      const cardWidth = card ? card.offsetWidth + 32 : 260;
      slider.style.transform = `translateX(${-idx * cardWidth}px)`;
    }

    document.getElementById('sliderPrev').onclick = function () {
      idx = Math.max(0, idx - 1);
      updateSlider();
    };

    document.getElementById('sliderNext').onclick = function () {
      const card = slider.querySelector('.product-card');
      const cardWidth = card ? card.offsetWidth + 32 : 260;
      const maxIdx = Math.max(0, slider.children.length - Math.ceil(visible));
      idx = Math.min(maxIdx, idx + 1);
      updateSlider();
    };

    updateSlider();
  }
});
