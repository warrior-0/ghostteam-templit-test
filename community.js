// ✅ community.js: 커뮤니티 기능 - 자유게시판은 Firebase에서 불러오고 작성 가능, 공지사항은 더미 데이터 유지

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore, collection, getDocs, addDoc, doc, getDoc, Timestamp
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
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

const noticeData = [
  {
    id: 'n1',
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
    titleElem.textContent = boardTitles[boardTypeOrTitle] || boardTypeOrTitle || '자유게시판';
  }
}

async function fetchCommunityData(boardType) {
  if (boardType === 'notice') return noticeData;

  const snapshot = await getDocs(collection(db, 'communityPosts'));
  const list = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.board === boardType) {
      list.push({ id: docSnap.id, ...data });
    }
  });
  return list;
}

async function renderCommunityList(sortType, boardType) {
  const list = await fetchCommunityData(boardType);

  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'popular') {
    list.sort((a, b) => b.likes - a.likes);
  }

  const communityList = document.getElementById('communityList');

  // 글쓰기 버튼
  const canWrite = boardType === 'free';
  const writeBtn = canWrite ? `<div style="text-align:right;margin-bottom:1rem;"><button id="writeBtn" style="padding:0.5rem 1rem;">글쓰기</button></div>` : '';

  if (list.length === 0) {
    communityList.innerHTML = writeBtn + `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
  } else {
    communityList.innerHTML = writeBtn +
      list.map(item => `
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
  }

  document.querySelectorAll('.community-item').forEach(itemElem => {
    itemElem.addEventListener('click', function(){
      const clickId = this.getAttribute('data-id');
      window.history.pushState({}, '', `?id=${clickId}&board=${boardType}`);
      renderCommunityDetail(clickId, boardType);
    });
  });

  if (canWrite) {
    document.getElementById('writeBtn').addEventListener('click', showWriteForm);
  }
}

async function renderCommunityDetail(id, boardType) {
  const list = await fetchCommunityData(boardType);
  const data = list.find(item => item.id === id);
  const communityList = document.getElementById('communityList');
  if (!data) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
    updateCommunityTitle(boardType);
    return;
  }
  const titleElem = document.querySelector('.community-title');
  if (titleElem) titleElem.textContent = data.title;

  communityList.innerHTML = `
    <div class="community-item community-detail">
      <div class="community-item-title" style="font-size:1.5rem;">${data.title}</div>
      <div class="community-item-meta">
        <span>좋아요 ${data.likes || 0}개</span>
        <span>${data.date}</span>
        <span>${boardTitles[data.board]}</span>
      </div>
      <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.detail || data.body}</div>
      <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
    </div>
  `;
  document.querySelector('.community-back-btn').addEventListener('click', function(){
    window.history.back();
  });
}

function showWriteForm() {
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }

  const communityList = document.getElementById('communityList');
  communityList.innerHTML = `
    <form id="postForm" class="community-item community-detail">
      <input type="text" id="postTitle" placeholder="제목" required style="width:100%;padding:0.6rem;margin-bottom:0.8rem;font-size:1.1rem;" />
      <input type="text" id="postBody" placeholder="줄거리" required style="width:100%;padding:0.6rem;margin-bottom:0.8rem;" />
      <textarea id="postDetail" placeholder="내용" required style="width:100%;padding:0.6rem;height:200px;margin-bottom:0.8rem;"></textarea>
      <button type="submit" style="padding:0.6rem 1.4rem;background:#222;color:#fff;border:none;border-radius:8px;">작성 완료</button>
    </form>
  `;

  document.getElementById('postForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const body = document.getElementById('postBody').value.trim();
    const detail = document.getElementById('postDetail').value.trim();

    const today = new Date();
    const date = today.toISOString().split('T')[0];

    await addDoc(collection(db, 'communityPosts'), {
      title,
      body,
      detail,
      date,
      likes: 0,
      board: 'free'
    });

    alert('게시글이 등록되었습니다.');
    window.location.reload();
  });
}

// 초기 로딩
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('communityList')) {
    let sortType = 'latest';
    let boardType = getParamFromURL('board') || 'free';
    const idParam = getParamFromURL('id');

    if (idParam) {
      renderCommunityDetail(idParam, boardType);
    } else {
      renderCommunityList(sortType, boardType);
      updateCommunityTitle(boardType);
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function(){
        document.querySelectorAll('.sort-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      });
    });

    const communityMenu = document.getElementById('communityMenu');
    if (communityMenu) {
      communityMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function(e){
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

    window.addEventListener('popstate', function() {
      const idParam = getParamFromURL('id');
      boardType = getParamFromURL('board') || 'free';
      if (idParam) {
        renderCommunityDetail(idParam, boardType);
      } else {
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      }
    });
  }
});
