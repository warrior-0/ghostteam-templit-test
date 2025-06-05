// ✅ community.js: 기존 더미 데이터 + Firebase 게시글 함께 표시 + 유저 작성 폼 처리

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  Timestamp
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
  appId: "1:776945022976:web:105e545d39f12b5d0940e5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    document.getElementById('writeForm').style.display = 'block';
  }
});

const dummyData = [
  { id: 'd1', title: '처음 인사드립니다!', likes: 7, date: '2025-05-21', board: 'free', body: '안녕하세요, 괴담지옥 자유게시판에 처음 글을 남깁니다.', detail: '이 사이트에서 다양한 괴담뿐 아니라 자유롭게 소통할 수 있어서 너무 좋네요. 앞으로 잘 부탁드립니다!' },
  { id: 'd2', title: '이벤트 공지: 괴담 공모전', likes: 15, date: '2025-05-19', board: 'notice', body: '[이벤트] 6월 괴담 공모전이 시작됩니다!', detail: '6월 한 달간 직접 겪은 괴담, 창작 괴담 등 다양한 이야기를 자유롭게 올려주세요! 우수작은 상품도 드립니다.' },
  { id: 'd3', title: '귀신 사진 자료 공유', likes: 3, date: '2025-05-18', board: 'archive', body: '예전에 찍힌 귀신 사진 몇 장 공유합니다.', detail: '사진은 링크로 올릴게요. 혹시 해석 가능하신 분 계시면 의견 부탁드려요!' },
  { id: 'd4', title: '오늘 무서운 꿈 꾼 사람 ㅠㅠ', likes: 5, date: '2025-05-20', board: 'free', body: '오늘 새벽에 너무 소름끼치는 꿈을 꿨는데 혹시 해몽 가능하신 분?', detail: '꿈에서 계속 쫓기는 느낌이 들었어요. 혹시 이런 꿈 해몽 아시는 분 계시면 댓글 부탁드려요!' }
];

const boardTitles = { free: '자유게시판', notice: '이벤트/공지', archive: '자료실' };

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

async function fetchFirebasePosts() {
  const snapshot = await getDocs(collection(db, 'communityPosts'));
  const list = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    list.push({
      id: doc.id,
      title: data.title,
      body: data.body,
      detail: data.detail,
      likes: data.likes || 0,
      date: data.date,
      board: data.board
    });
  });
  return list;
}

async function renderCommunityList(sortType, boardType) {
  let list = [...dummyData];
  const firebasePosts = await fetchFirebasePosts();
  list.push(...firebasePosts);

  if (boardType && boardType !== 'all') {
    list = list.filter(item => item.board === boardType);
  }

  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'popular') {
    list.sort((a, b) => b.likes - a.likes);
  }

  const communityList = document.getElementById('communityList');
  if (list.length === 0) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
  } else {
    communityList.innerHTML = list.map(item => `
      <div class="community-item" data-id="${item.id}" style="cursor:pointer;">
        <div class="community-item-title">${item.title}</div>
        <div class="community-item-meta">
          <span>좋아요 ${item.likes}개</span>
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
        renderCommunityDetail(id, list);
      });
    });
  }
}

function renderCommunityDetail(id, sourceList) {
  const data = sourceList.find(item => item.id === id);
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
        <span>좋아요 ${data.likes}개</span>
        <span>${data.date}</span>
        <span>${boardTitles[data.board]}</span>
      </div>
      <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.detail || data.body}</div>
      <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
    </div>
  `;
  document.querySelector('.community-back-btn').addEventListener('click', () => window.history.back());
}

document.addEventListener('DOMContentLoaded', () => {
  let sortType = 'latest';
  let boardType = getParamFromURL('board') || 'free';
  const idParam = getParamFromURL('id');

  if (idParam) {
    fetchFirebasePosts().then(firebasePosts => {
      const fullList = [...dummyData, ...firebasePosts];
      renderCommunityDetail(idParam, fullList);
    });
  } else {
    renderCommunityList(sortType, boardType);
    updateCommunityTitle(boardType);
  }

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sortType = btn.dataset.sort;
      renderCommunityList(sortType, boardType);
    });
  });

  const communityMenu = document.getElementById('communityMenu');
  if (communityMenu) {
    communityMenu.querySelectorAll('.submenu a').forEach(link => {
      link.addEventListener('click', function(e) {
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

  window.addEventListener('popstate', () => {
    const idParam = getParamFromURL('id');
    boardType = getParamFromURL('board') || 'free';
    if (idParam) {
      fetchFirebasePosts().then(firebasePosts => {
        const fullList = [...dummyData, ...firebasePosts];
        renderCommunityDetail(idParam, fullList);
      });
    } else {
      renderCommunityList(sortType, boardType);
      updateCommunityTitle(boardType);
    }
  });

  // 글쓰기 폼 처리
  const form = document.getElementById('writeForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!currentUser) {
        alert('로그인이 필요합니다');
        return;
      }
      const title = document.getElementById('postTitle').value.trim();
      const body = document.getElementById('postBody').value.trim();
      const detail = document.getElementById('postDetail').value.trim();
      const board = document.getElementById('postBoard').value;
      if (!title || !body || !detail) return;
      const date = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'communityPosts'), {
        title, body, detail, board,
        date,
        likes: 0
      });
      alert('게시글이 등록되었습니다');
      form.reset();
      renderCommunityList(sortType, boardType);
    });
  }
});
