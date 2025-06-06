
  // ✅ community.js: 자유게시판 글쓰기 + Firebase 저장 + 공지사항은 더미 유지 + 스타일 유지
  
  import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  
  import {
    getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  
  import {
    getAuth,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  
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
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  let currentUser = null;
  onAuthStateChanged(auth, user => {
    currentUser = user;
  });
  
  const dummyData = [
    {
      id: 'notice-1',
      title: '이벤트 공지: 괴담 공모전',
      likes: 15,
      date: '2025-05-19',
      board: 'notice',
      body: '[이벤트] 6월 괴담 공모전이 시작됩니다!',
      detail: '6월 한 달간 직접 겪은 괴담, 창작 괴담 등 다양한 이야기를 자유롭게 올려주세요! 우수작은 상품도 드립니다.'
    }
  ];
  
  const boardTitles = {
    free: '자유게시판',
    notice: '이벤트/공지'
  };
  
  function getParamFromURL(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }
  
  function updateCommunityTitle(boardTypeOrTitle) {
    const titleElem = document.querySelector('.community-title');
    if (titleElem) {
      titleElem.textContent = boardTitles[boardTypeOrTitle] || '자유게시판';
    }
  }
  
  async function loadCommunityData(boardType) {
    let data = [];
    if (boardType === 'notice') {
      data = dummyData;
    } else if (boardType === 'free') {
      const snap = await getDocs(collection(db, 'communityPosts'));
      snap.forEach(doc => {
        const d = doc.data();
        if (d.board === boardType) {
          data.push({ id: doc.id, ...d });
        }
      });
    }
    return data;
  }
  
  async function renderCommunityList(sortType, boardType) {
    const communityList = document.getElementById('communityList');
    let list = await loadCommunityData(boardType);
  
    if (sortType === 'latest') {
      list.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortType === 'popular') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
  
    communityList.innerHTML = '';
    if (boardType === 'free' && currentUser) {
      communityList.innerHTML += `
        <div class="community-form" style="margin-bottom:2rem;">
          <input id="postTitle" placeholder="제목을 입력하세요" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;" />
          <input id="postBody" placeholder="줄거리를 입력하세요" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;" />
          <textarea id="postDetail" placeholder="내용을 입력하세요" style="width:100%;height:100px;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
          <button id="submitPost">글쓰기</button>
        </div>
      `;
      document.getElementById('submitPost').addEventListener('click', async () => {
        const title = document.getElementById('postTitle').value.trim();
        const body = document.getElementById('postBody').value.trim();
        const detail = document.getElementById('postDetail').value.trim();
        const now = new Date().toISOString().slice(0, 10);
        if (!title || !body || !detail) {
          alert('모든 필드를 입력해주세요.');
          return;
        }
        await addDoc(collection(db, 'communityPosts'), {
          title,
          body,
          detail,
          board: 'free',
          date: now,
          likes: 0
        });
        renderCommunityList(sortType, boardType);
      });
    }
  
    if (list.length === 0) {
      communityList.innerHTML += `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
    } else {
      communityList.innerHTML += list.map(item => `
        <div class="community-item" data-id="${item.id}" style="cursor:pointer;">
          <div class="community-item-title">${item.title}</div>
          <div class="community-item-meta">
            <span>좋아요 ${item.likes || 0}개</span>
            <span>${item.date}</span>
            <span>${boardTitles[item.board]}</span>
          </div>
          <div class="community-item-body">${item.body}</div>
        </div>
      `).join('');
      document.querySelectorAll('.community-item').forEach(elem => {
        elem.addEventListener('click', () => {
          const id = elem.getAttribute('data-id');
          window.history.pushState({}, '', `?id=${id}`);
          renderCommunityDetail(id, boardType);
        });
      });
    }
  }
  
  async function renderCommunityDetail(id, boardType) {
    const communityList = document.getElementById('communityList');
    let data;
    if (boardType === 'notice') {
      data = dummyData.find(d => d.id === id);
    } else {
      const docSnap = await getDoc(doc(db, 'communityPosts', id));
      if (!docSnap.exists()) {
        communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
        return;
      }
      data = docSnap.data();
    }
  
    communityList.innerHTML = `
      <div class="community-item community-detail">
        <div class="community-item-title" style="font-size:1.5rem;">${data.title}</div>
        <div class="community-item-meta">
          <span>좋아요 ${data.likes || 0}개</span>
          <span>${data.date}</span>
          <span>${boardTitles[data.board]}</span>
        </div>
        <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.detail}</div>
        <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
      </div>
    `;
    document.querySelector('.community-back-btn').addEventListener('click', () => {
      window.history.back();
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const idParam = getParamFromURL('id');
    let sortType = 'latest';
    let boardType = getParamFromURL('board') || 'free';
  
    updateCommunityTitle(boardType);
  
    if (idParam) {
      renderCommunityDetail(idParam, boardType);
    } else {
      renderCommunityList(sortType, boardType);
    }
  
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderCommunityList(sortType, boardType);
      });
    });
  
    const communityMenu = document.getElementById('communityMenu');
    if (communityMenu) {
      communityMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const url = new URL(this.href);
          boardType = url.searchParams.get('board') || 'free';
          window.history.pushState({}, '', url.pathname + url.search);
          updateCommunityTitle(boardType);
          renderCommunityList(sortType, boardType);
        });
      });
    }
  
    window.addEventListener('popstate', () => {
      const idParam = getParamFromURL('id');
      boardType = getParamFromURL('board') || 'free';
      updateCommunityTitle(boardType);
      if (idParam) {
        renderCommunityDetail(idParam, boardType);
      } else {
        renderCommunityList(sortType, boardType);
      }
    });
  });
