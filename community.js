// ✅ community.js

import {
  getFirestore, doc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

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
onAuthStateChanged(auth, user => currentUser = user);

function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function getUserNickname(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? (userDoc.data().nickname || '익명') : '익명';
}

// ✅ 게시글 렌더링
async function renderCommunityList(sortType = 'latest', board = 'free') {
  const listElem = document.getElementById('communityList');
  const snapshot = await getDocs(collection(db, 'communityPosts'));
  const posts = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.board === board) posts.push({ id: docSnap.id, ...data });
  });

  if (sortType === 'latest') posts.sort((a, b) => b.date.localeCompare(a.date));
  else if (sortType === 'popular') posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));

  if (posts.length === 0) {
    listElem.innerHTML = '<div style="padding:2rem; color:#aaa;">게시글이 없습니다.</div>';
    return;
  }

  listElem.innerHTML = posts.map(post => `
    <div class="post-card" style="cursor:pointer" data-id="${post.id}">
      <div class="post-title">${post.title}</div>
      <div class="post-meta">
        <span>좋아요 ${post.likes || 0}</span>
        <span>${post.date}</span>
        <span>${post.nickname}</span>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      window.history.pushState({}, '', `?id=${id}`);
      renderPostDetail(id);
    });
  });
}

// ✅ 게시글 상세 렌더링
async function renderPostDetail(id) {
  const wrapper = document.getElementById('postDetailWrapper');
  const listWrapper = document.getElementById('communityListWrapper');
  const detailElem = document.getElementById('postDetail');

  const docSnap = await getDoc(doc(db, 'communityPosts', id));
  if (!docSnap.exists()) {
    detailElem.innerHTML = '<p>게시글을 찾을 수 없습니다.</p>';
    return;
  }

  const data = docSnap.data();
  detailElem.innerHTML = `
    <div class="post-meta">
      <span>좋아요 <span id="likeCount">${data.likes || 0}</span></span>
      <span>${data.date}</span>
      <span>${data.board}</span>
      <span>${data.nickname}</span>
    </div>
    <div class="post-body" style="margin-top:1rem;font-size:1.1rem;line-height:1.6;">${data.detail}</div>
    <div class="like-section" style="margin-top: 1rem;">
      <button id="likeBtn">❤️ 좋아요</button>
    </div>
    <div class="comment-section" style="margin-top:2rem;">
      <form id="commentForm">
        <input type="text" id="commentInput" placeholder="댓글을 입력하세요" required />
        <button type="submit">댓글 작성</button>
      </form>
      <div id="commentList"></div>
    </div>
  `;

  wrapper.style.display = 'block';
  listWrapper.style.display = 'none';

  document.getElementById('backToListBtn').onclick = () => {
    window.history.pushState({}, '', 'community.html');
    wrapper.style.display = 'none';
    listWrapper.style.display = 'block';
  };

  setupLikeButton(id);
  setupCommentSection(id);
}

function setupLikeButton(postId) {
  const btn = document.getElementById('likeBtn');
  const countEl = document.getElementById('likeCount');
  const postRef = doc(db, 'communityLikes', postId);

  getDoc(postRef).then(docSnap => {
    const data = docSnap.exists() ? docSnap.data() : { count: 0, users: [] };
    countEl.textContent = data.count || 0;
    btn.addEventListener('click', async () => {
      if (!currentUser) return alert('로그인이 필요합니다');
      const uid = currentUser.uid;
      if (data.users.includes(uid)) return alert('이미 좋아요를 누르셨습니다.');
      data.count++;
      data.users.push(uid);
      await setDoc(postRef, data);
      countEl.textContent = data.count;
    });
  });
}

function setupCommentSection(postId) {
  const form = document.getElementById('commentForm');
  const input = document.getElementById('commentInput');
  const list = document.getElementById('commentList');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('로그인이 필요합니다');
    const text = input.value.trim();
    if (!text) return;
    const nickname = await getUserNickname(currentUser.uid);
    await addDoc(collection(db, 'communityComments'), {
      postId,
      uid: currentUser.uid,
      nickname,
      text,
      timestamp: Date.now()
    });
    input.value = '';
    loadComments(postId);
  });

  loadComments(postId);
}

async function loadComments(postId) {
  const list = document.getElementById('commentList');
  list.innerHTML = '';
  const snapshot = await getDocs(collection(db, 'communityComments'));
  const comments = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.postId === postId) comments.push({ id: docSnap.id, ...data });
  });

  comments.sort((a, b) => b.timestamp - a.timestamp);
  comments.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <div><strong>${comment.nickname}:</strong> <span>${comment.text}</span></div>
      ${currentUser?.uid === comment.uid ? `
        <button data-id="${comment.id}" class="editBtn">수정</button>
        <button data-id="${comment.id}" class="deleteBtn">삭제</button>
      ` : ''}
    `;
    list.appendChild(div);
  });

  list.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const newText = prompt('수정할 내용을 입력하세요');
      if (newText) {
        await updateDoc(doc(db, 'communityComments', id), { text: newText });
        loadComments(postId);
      }
    });
  });

  list.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('삭제하시겠습니까?')) {
        await deleteDoc(doc(db, 'communityComments', id));
        loadComments(postId);
      }
    });
  });
}

// ✅ 초기 실행
const boardParam = getParamFromURL('board') || 'free';
const postIdParam = getParamFromURL('id');
if (postIdParam) renderPostDetail(postIdParam);
else renderCommunityList('latest', boardParam);

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const sort = this.dataset.sort;
    renderCommunityList(sort, boardParam);
  });
});
