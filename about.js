document.addEventListener('DOMContentLoaded', () => {
  const aboutContent = document.getElementById('aboutContent');
  const titleElem = document.querySelector('.about-title');

  const pageParam = new URLSearchParams(window.location.search).get('page') || 'intro';

  const contentMap = {
    intro: {
      title: '사이트 소개',
      body: `괴담지옥은 전 세계의 무서운 이야기와 실화를 공유하는 공간입니다.<br>
             한국/해외 괴담부터 사용자 제보까지 다양한 콘텐츠를 경험하세요.`
    },
    greeting: {
      title: '운영자 인사말',
      body: `안녕하세요. 괴담지옥을 운영하는 운영자입니다.<br>
             공포를 사랑하는 모든 분들과 함께 이 공간을 만들어가고 싶습니다.`
    },
    contact: {
      title: '문의/제보하기',
      body: `문의사항이나 괴담 제보는 아래 이메일로 보내주세요.<br>
             <strong>contact@ghojamhell.com</strong>`
    }
  };

  const selected = contentMap[pageParam] || contentMap.intro;

  if (titleElem) titleElem.textContent = selected.title;
  if (aboutContent) aboutContent.innerHTML = selected.body;

  const aboutMenu = document.getElementById('aboutMenu');
  if (aboutMenu) {
    aboutMenu.querySelectorAll('.submenu a').forEach(link => {
      link.addEventListener('click', function(e){
        e.preventDefault();
        const url = new URL(this.href);
        const newPage = url.searchParams.get('page') || 'intro';
        const newData = contentMap[newPage] || contentMap.intro;
        window.history.pushState({}, '', url.pathname + url.search);
        if (titleElem) titleElem.textContent = newData.title;
        if (aboutContent) aboutContent.innerHTML = newData.body;
      });
    });

    window.addEventListener('popstate', () => {
      const newPage = new URLSearchParams(window.location.search).get('page') || 'intro';
      const newData = contentMap[newPage] || contentMap.intro;
      if (titleElem) titleElem.textContent = newData.title;
      if (aboutContent) aboutContent.innerHTML = newData.body;
    });
  }
});
