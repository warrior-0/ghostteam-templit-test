// ✅ community.js: 자유게시판 글쓰기 및 이벤트 게시판 더미 데이터 표시

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore, doc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, setDoc
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

function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function getUserNickname(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return data.nickname || '익명';
  }
  return '익명';
}

function renderDummyPosts() {
  const dummy = [
    { title: '이벤트 당첨자 발표', body: '축하합니다! 다음 이벤트에도 참여해주세요.', date: '2025-06-01', nickname: '운영자' },
    { title: '6월 괴담 공모전 안내', body: '총 상금 100만원! 지금 참여하세요.', date: '2025-06-03', nickname: '운영자' }
  ];
  const container = document.getElementById('communityList');
  container.innerHTML = dummy.map(item => `
    <div class="community-card">
      <div class="community-title">${item.title}</div>
      <div class="community-meta">
        <span>${item.date}</span>
        <span>${item.nickname}</span>
      </div>
      <div class="community-body">${item.body}</div>
    </div>
  `).join('');
}

async function renderCommunityPosts(board) {
  const container = document.getElementById('communityList');
  container.innerHTML = '';

  const snapshot = await getDocs(collection(db, 'communityPosts'));
  const list = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.board === board) {
      list.push({ id: docSnap.id, ...data });
    }
  });

  list.sort((a, b) => b.date.localeCompare(a.date));

  container.innerHTML = list.map(post => `
    <div class="community-card" data-id="${post.id}" style="cursor:pointer">
      <div class="community-title">${post.title}</div>
      <div class="community-meta">
        <span>${post.date}</span>
        <span>${post.nickname}</span>
      </div>
      <div class="community-body">${post.body}</div>
    </div>
  `).join('');

  container.querySelectorAll('.community-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      window.location.href = `community.html?id=${id}&board=${board}`;
    });
  });
}

async function setupWriteForm() {
  const writeForm = document.getElementById('writeForm');
  if (!writeForm) return;
  const boardParam = getParamFromURL('board');
  if (boardParam !== 'free') return;
  writeForm.style.display = 'block';

  writeForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('로그인이 필요합니다');

    const title = document.getElementById('writeTitle').value.trim();
    const body = document.getElementById('writeBody').value.trim();
    const detail = document.getElementById('writeDetail').value.trim();

    if (!title || !body || !detail) return alert('모든 필드를 입력하세요');

    const nickname = await getUserNickname(currentUser.uid);
    const dateStr = new Date().toISOString().slice(0, 10);

    await addDoc(collection(db, 'communityPosts'), {
      title,
      body,
      detail,
      board: 'free',
      date: dateStr,
      likes: 0,
      nickname,
      uid: currentUser.uid
    });

    alert('게시글이 등록되었습니다.');
    location.reload();
  });
}

// 페이지 초기화
const board = getParamFromURL('board') || 'free';
const postId = getParamFromURL('id');
const detailContainer = document.getElementById('postDetail');

const boardTitles = {
  free: '자유게시판',
  notice: '이벤트/공지',
  archive: '자료실'
};
const boardTitleElem = document.getElementById('communityBoardTitle');
if (boardTitleElem) {
  boardTitleElem.textContent = boardTitles[board] || '커뮤니티';
}

if (postId && detailContainer) {
  getDoc(doc(db, 'communityPosts', postId)).then(docSnap => {
    if (!docSnap.exists()) {
      detailContainer.innerHTML = '<p>게시글을 찾을 수 없습니다.</p>';
      return;
    }
    const data = docSnap.data();
    detailContainer.innerHTML = `
      <div class="post-meta">
        <span>${data.date}</span>
        <span>${data.board}</span>
        <span>${data.nickname}</span>
      </div>
      <div class="post-body" style="margin-top:1rem;font-size:1.1rem;line-height:1.6;">${data.detail}</div>
    `;
  });
} else {
  if (board === 'notice') {
    renderDummyPosts();
  } else {
    renderCommunityPosts(board);
  }
  setupWriteForm();
}
