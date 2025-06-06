
// ✅ urban.js: 괴담 + 커뮤니티 목록/상세/댓글/좋아요 기능 포함 (Firebase 연동)

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

function setupLikeButton(postId, collectionName = 'urbanLikes') {
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');
  if (!likeBtn || !likeCount) return;

  const postRef = doc(db, collectionName, String(postId));

  getDoc(postRef).then(docSnap => {
    const data = docSnap.exists() ? docSnap.data() : { count: 0, users: [] };
    likeCount.textContent = data.count || 0;

    likeBtn.addEventListener('click', async () => {
      if (!currentUser) return alert('로그인이 필요합니다');
      const uid = currentUser.uid;
      const alreadyLiked = data.users?.includes(uid);
      if (alreadyLiked) return alert('이미 좋아요를 누르셨습니다');

      data.count += 1;
      data.users.push(uid);
      await setDoc(postRef, data);
      likeCount.textContent = data.count;
    });
  });
}

async function loadComments(postId, collectionName = 'urbanComments') {
  const commentList = document.getElementById('commentList');
  commentList.innerHTML = '';
  const snapshot = await getDocs(collection(db, collectionName));
  const filtered = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.postId === postId) {
      filtered.push({ id: docSnap.id, ...data });
    }
  });
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  filtered.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <div><strong>${comment.nickname || '익명'}:</strong> <span>${comment.text}</span></div>
      ${currentUser?.uid === comment.uid ? `
        <button data-id="${comment.id}" class="editBtn">수정</button>
        <button data-id="${comment.id}" class="deleteBtn">삭제</button>
      ` : ''}
    `;
    commentList.appendChild(div);
  });

  commentList.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const newText = prompt('수정할 내용을 입력하세요');
      if (newText) {
        await updateDoc(doc(db, collectionName, id), { text: newText });
        loadComments(postId, collectionName);
      }
    });
  });

  commentList.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('삭제하시겠습니까?')) {
        await deleteDoc(doc(db, collectionName, id));
        loadComments(postId, collectionName);
      }
    });
  });
}

function setupCommentSection(postId, collectionName = 'urbanComments') {
  const form = document.getElementById('commentForm');
  const input = document.getElementById('commentInput');
  if (!form || !input) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('로그인이 필요합니다');
    const text = input.value.trim();
    if (!text) return;

    const nickname = await getUserNickname(currentUser.uid);

    await addDoc(collection(db, collectionName), {
      postId,
      uid: currentUser.uid,
      nickname,
      text,
      timestamp: Date.now()
    });

    input.value = '';
    loadComments(postId, collectionName);
  });

  loadComments(postId, collectionName);
}

// ✅ 커뮤니티 글쓰기
const writeForm = document.getElementById('writeForm');
if (writeForm) {
  writeForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) return alert('로그인이 필요합니다');

    const title = document.getElementById('writeTitle').value.trim();
    const body = document.getElementById('writeBody').value.trim();
    const board = document.getElementById('writeBoard').value;
    if (!title || !body) return alert('제목과 내용을 모두 입력해주세요');

    const nickname = await getUserNickname(currentUser.uid);
    const dateStr = new Date().toISOString().slice(0, 10);

    await addDoc(collection(db, 'communityPosts'), {
      title,
      body,
      detail: body,
      board,
      date: dateStr,
      likes: 0,
      nickname,
      uid: currentUser.uid
    });

    alert('게시글이 등록되었습니다.');
    location.href = `community.html?board=${board}`;
  });
}

// ✅ 커뮤니티 게시글 상세 보기 렌더링
const postId = getParamFromURL('id');
const postDetailContainer = document.getElementById('postDetail');
if (postId && postDetailContainer) {
  getDoc(doc(db, 'communityPosts', postId)).then(docSnap => {
    if (!docSnap.exists()) {
      postDetailContainer.innerHTML = '<p>게시글을 찾을 수 없습니다.</p>';
      return;
    }
    const data = docSnap.data();
    postDetailContainer.innerHTML = `
      <div class="post-meta">
        <span>좋아요 <span id="likeCount">0</span></span>
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

    setupLikeButton(postId, 'communityLikes');
    setupCommentSection(postId, 'communityComments');
  });
}
