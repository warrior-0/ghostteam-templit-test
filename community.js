// ✅ community.js: Firebase 데이터로 게시글 목록 렌더링 (더미 스타일 유지)

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, doc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
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
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    document.getElementById('writeForm')?.style?.setProperty('display', 'block');
  }
});

const boardTitles = {
  free: '자유게시판',
  notice: '이벤트/공지',
  archive: '자료실'
};

function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function updateCommunityTitle(boardTypeOrTitle) {
  const titleElem = document.querySelector('.community-title');
  if (titleElem) {
    titleElem.textContent = boardTitles[boardTypeOrTitle] || boardTypeOrTitle || '자유게시판';
  }
}

async function fetchCommunityData() {
  const snapshot = await getDocs(collection(db, 'communityPosts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function renderCommunityList(sortType, boardType) {
  const list = await fetchCommunityData();
  let filtered = boardType && boardType !== 'all'
    ? list.filter(item => item.board === boardType)
    : list;

  if (sortType === 'latest') {
    filtered.sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.());
  } else if (sortType === 'popular') {
    filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  const communityList = document.getElementById('communityList');
  if (filtered.length === 0) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
  } else {
    communityList.innerHTML = filtered.map(item => `
      <div class="community-item" data-id="${item.id}" style="cursor:pointer;">
        <div class="community-item-title">${item.title}</div>
        <div class="community-item-meta">
          <span>좋아요 ${item.likes || 0}개</span>
          <span>${new Date(item.timestamp?.toMillis?.() || Date.now()).toISOString().split('T')[0]}</span>
          <span>${boardTitles[item.board]}</span>
        </div>
        <div class="community-item-body">${item.body}</div>
      </div>
    `).join('');

    document.querySelectorAll('.community-item').forEach(itemElem => {
      itemElem.addEventListener('click', function () {
        const clickId = this.getAttribute('data-id');
        window.history.pushState({}, '', `?id=${clickId}`);
        renderCommunityDetail(clickId);
      });
    });
  }
}

async function renderCommunityDetail(id) {
  const docSnap = await getDoc(doc(db, 'communityPosts', id));
  const data = docSnap.exists() ? docSnap.data() : null;

  const communityList = document.getElementById('communityList');
  if (!data) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
    updateCommunityTitle('자유게시판');
    return;
  }

  const titleElem = document.querySelector('.community-title');
  if (titleElem) titleElem.textContent = data.title;

  communityList.innerHTML = `
    <div class="community-item community-detail">
      <div class="community-item-title" style="font-size:1.5rem;">${data.title}</div>
      <div class="community-item-meta">
        <span>좋아요 ${data.likes || 0}개</span>
        <span>${new Date(data.timestamp?.toMillis?.() || Date.now()).toISOString().split('T')[0]}</span>
        <span>${boardTitles[data.board]}</span>
      </div>
      <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.detail || data.body}</div>
      <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
    </div>
  `;
  document.querySelector('.community-back-btn').addEventListener('click', () => {
    window.history.back();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('communityList')) {
    let sortType = 'latest';
    let boardType = getParamFromURL('board') || 'free';
    const idParam = getParamFromURL('id');

    if (idParam) {
      renderCommunityDetail(idParam);
    } else {
      renderCommunityList(sortType, boardType);
      updateCommunityTitle(boardType);
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      });
    });

    const communityMenu = document.getElementById('communityMenu');
    if (communityMenu) {
      communityMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const url = new URL(this.href);
          const newBoard = url.searchParams.get('board') || 'free';
          boardType = newBoard;
          window.history.pushState({}, '', url.pathname + url.search);
          renderCommunityList(sortType, boardType);
          updateCommunityTitle(boardType);
        });
      });
    }

    window.addEventListener('popstate', function () {
      const idParam = getParamFromURL('id');
      boardType = getParamFromURL('board') || 'free';
      if (idParam) {
        renderCommunityDetail(idParam);
      } else {
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      }
    });
  }

  const writeForm = document.getElementById('writeForm');
  if (writeForm) {
    writeForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!currentUser) return alert('로그인이 필요합니다.');

      const title = document.getElementById('postTitle').value.trim();
      const body = document.getElementById('postBody').value.trim();
      const detail = document.getElementById('postDetail').value.trim();
      const board = document.getElementById('postBoard').value;

      if (!title || !body || !detail) return alert('모든 항목을 입력해주세요.');

      await addDoc(collection(db, 'communityPosts'), {
        title,
        body,
        detail,
        board,
        likes: 0,
        timestamp: serverTimestamp()
      });

      alert('게시글이 등록되었습니다.');
      location.reload();
    });
  }
});
