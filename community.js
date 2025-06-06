// community.js
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore, doc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, setDoc, query, where
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
  return userDoc.exists() ? (userDoc.data().nickname || '익명') : '익명';
}

// 글쓰기 폼 표시/숨기기
const writeForm = document.getElementById('writeForm');
document.getElementById('showWriteForm')?.addEventListener('click', () => {
  writeForm.style.display = writeForm.style.display === 'none' ? 'block' : 'none';
});

// 글쓰기 처리
writeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return alert('로그인이 필요합니다');

  const title = document.getElementById('writeTitle').value.trim();
  const body = document.getElementById('writeBody').value.trim();
  const detail = document.getElementById('postDetailInput').value.trim();
  const board = document.getElementById('writeBoard').value;
  if (!title || !body || !detail) return alert('모든 항목을 입력해주세요');

  const nickname = await getUserNickname(currentUser.uid);
  const dateStr = new Date().toISOString().slice(0, 10);

  await addDoc(collection(db, 'communityPosts'), {
    title, body, detail, board, date: dateStr, likes: 0, nickname, uid: currentUser.uid
  });

  alert('게시글이 등록되었습니다.');
  location.href = `community.html?board=${board}`;
});

// 게시글 목록 불러오기
async function loadPosts(board, sort = 'latest') {
  const listContainer = document.getElementById('communityList');
  listContainer.innerHTML = '';

  const snapshot = await getDocs(query(collection(db, 'communityPosts'), where('board', '==', board)));
  let posts = [];
  snapshot.forEach(docSnap => {
    posts.push({ id: docSnap.id, ...docSnap.data() });
  });

  posts.sort((a, b) => sort === 'popular' ? b.likes - a.likes : new Date(b.date) - new Date(a.date));

  if (posts.length === 0) {
    listContainer.innerHTML = '<p>게시글이 없습니다.</p>';
    return;
  }

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.innerHTML = `
      <h3><a href="community.html?id=${post.id}">${post.title}</a></h3>
      <p>${post.body}</p>
      <div class="meta">${post.date} | ${post.nickname} | 좋아요 ${post.likes}</div>
    `;
    listContainer.appendChild(div);
  });
}

// 현재 게시판 및 게시글 불러오기
const board = getParamFromURL('board') || 'free';
const sortButtons = document.querySelectorAll('.sort-btn');
document.getElementById('boardSelector')?.value = board;
document.getElementById('boardTitle').textContent = {
  free: '자유게시판', notice: '이벤트/공지', archive: '자료실'
}[board] || '자유게시판';

let currentSort = 'latest';
sortButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    sortButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    loadPosts(board, currentSort);
  });
});

loadPosts(board);

// 게시판 변경 시 이동
const boardSelector = document.getElementById('boardSelector');
boardSelector?.addEventListener('change', () => {
  location.href = `community.html?board=${boardSelector.value}`;
});

// 게시글 상세 보기
const postId = getParamFromURL('id');
const postDetailContainer = document.getElementById('postDetail');

if (postId && postDetailContainer) {
  getDoc(doc(db, 'communityPosts', postId)).then(async docSnap => {
    if (!docSnap.exists()) {
      postDetailContainer.innerHTML = '<p>게시글을 찾을 수 없습니다.</p>';
      return;
    }
    const data = docSnap.data();
    postDetailContainer.innerHTML = `
      <div class="post-meta">
        <span>${data.date}</span>
        <span>${data.board}</span>
        <span>${data.nickname}</span>
      </div>
      <div class="post-body" style="margin-top:1rem;line-height:1.6;">${data.detail}</div>
    `;
  });
}
