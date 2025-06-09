// ✅ urban.js: 괴담 목록, 상세보기, 좋아요 및 댓글 기능 포함 + Firebase 연동 (likes를 Firestore로 대체)

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

function updateUrbanTitle(filterTypeOrTitle) {
  const titleElem = document.querySelector('.urban-title');
  if (titleElem) {
    titleElem.textContent = filterTitles[filterTypeOrTitle] || filterTypeOrTitle || '괴담 모음';
  }
}

function renderLevelStars(level) {
  return '★'.repeat(level) + '☆'.repeat(5 - level);
}

function setupLikeButton(postId) {
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');

  if (!likeBtn || !likeCount) return;

  const postRef = doc(db, 'urbanLikes', String(postId));

  getDoc(postRef).then(docSnap => {
    const data = docSnap.exists() ? docSnap.data() : { count: 0, users: [] };
    likeCount.textContent = data.count || 0;

    likeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('로그인이 필요합니다');
        return;
      }
      const uid = currentUser.uid;
      const alreadyLiked = data.users?.includes(uid);

      if (alreadyLiked) {
        alert('이미 좋아요를 누르셨습니다');
        return;
      }

      data.count = (data.count || 0) + 1;
      data.users = [...(data.users || []), uid];

      await setDoc(postRef, data);
      likeCount.textContent = data.count;
    });
  });
}

async function getLikeCount(postId) {
  const docSnap = await getDoc(doc(db, 'urbanLikes', String(postId)));
  return docSnap.exists() ? (docSnap.data().count || 0) : 0;
}

async function getUserNickname(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.nickname || '익명';
    }
  } catch (err) {
    console.warn('닉네임 조회 실패:', err);
  }
  return '익명';
}

async function loadComments(postId) {
  const commentList = document.getElementById('commentList');
  commentList.innerHTML = '';
  const q = collection(db, 'urbanComments');
  const snapshot = await getDocs(q);
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
        await updateDoc(doc(db, 'urbanComments', id), { text: newText });
        loadComments(postId);
      }
    });
  });

  commentList.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('삭제하시겠습니까?')) {
        await deleteDoc(doc(db, 'urbanComments', id));
        loadComments(postId);
      }
    });
  });
}

function setupCommentSection(postId) {
  const form = document.getElementById('commentForm');
  const input = document.getElementById('commentInput');
  if (!form || !input) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) {
      alert('로그인이 필요합니다');
      return;
    }
    const text = input.value.trim();
    if (!text) return;

    let nickname = '익명';
    try {
      nickname = await getUserNickname(currentUser.uid);
    } catch (e) {
      console.warn('닉네임 가져오기 실패:', e);
    }

    try {
      await addDoc(collection(db, 'urbanComments'), {
        postId,
        uid: currentUser.uid,
        nickname,
        text,
        timestamp: Date.now()
      });

      input.value = '';
      loadComments(postId);
    } catch (e) {
      alert('댓글 저장 실패: ' + e.message);
      console.error(e);
    }
  });

  loadComments(postId);
}

async function renderUrbanList(sortType, filterType) {
  let list = [...urbanData];
  if (filterType && filterType !== 'all') {
    list = list.filter(item => item.filter === filterType);
  }
  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'level') {
    list.sort((a, b) => b.level - a.level);
  }

  const urbanList = document.getElementById('urbanList');
  urbanList.innerHTML = '';
  for (const item of list) {
    const likeCount = await getLikeCount(item.id);
    const card = document.createElement('div');
    card.className = 'product-card urban-item';
    card.dataset.id = item.id;
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <img src="${item.thumb}" alt="${item.title}">
      <div class="urban-item-title">${item.title}</div>
      <div class="urban-item-meta">
        <span>좋아요 ${likeCount}개</span>
        <span>${item.date}</span>
      </div>
      <div style="color:#e01c1c;font-size:0.95rem;margin-bottom:0.2rem;">
        공포 난이도: ${renderLevelStars(item.level)}
      </div>
    `;
    card.addEventListener('click', () => {
      window.history.pushState({}, '', `?id=${item.id}`);
      renderUrbanDetail(item.id);
    });
    urbanList.appendChild(card);
  }
}

function renderUrbanDetail(id) {
  const data = urbanData.find(item => item.id === id);
  if (!data) return;
  const titleElem = document.querySelector('.urban-title');
  if (titleElem) titleElem.textContent = data.title;

  const urbanList = document.getElementById('urbanList');
  urbanList.innerHTML = `
    <div class="product-card urban-item urban-detail" style="width:100%;max-width:1200px;margin:0 auto;">
      <div class="urban-item-title">${data.title}</div>
      <div class="urban-item-meta">
        <span>${data.date}</span>
      </div>
      <div style="color:#e01c1c;margin-bottom:1rem;">
        공포 난이도: ${renderLevelStars(data.level)}
      </div>
      <div style="font-size:1.1rem;line-height:1.7;">${data.detail}</div>

      <div class="like-section" style="margin-top: 1rem;">
        <button id="likeBtn">❤️ 좋아요</button> <span id="likeCount">0</span>
      </div>

      <div class="comment-section" style="margin-top:2rem;">
        <form id="commentForm">
          <input type="text" id="commentInput" placeholder="댓글을 입력하세요" required />
          <button type="submit">댓글 작성</button>
        </form>
        <div id="commentList"></div>
      </div>

      <button class="urban-back-btn" style="margin-top:2rem;">목록으로</button>
    </div>
  `;

  document.querySelector('.urban-back-btn').addEventListener('click', () => {
    window.history.back();
  });

  setupLikeButton(id);
  setupCommentSection(id);
}

const filterTitles = {
  all: '전체 괴담 모음',
  korea: '한국 괴담',
  foreign: '해외 괴담',
  true: '실화 이야기',
  user: '사용자 제보 괴담'
};

export const urbanData = [
  {
    id: 1,
    title: '층간소음',
    date: '2025-05-20',
    filter: 'korea',
    level: 4,
    thumb: 'image/urban1.png',
    body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분... ',
    detail: `이 이야기는 실제로 2021년 서울의 한 골목에서 벌어진 일...`
  },
  {
    id: 2,
    title: '하나코야 놀자',
    date: '2025-05-18',
    filter: 'foreign',
    level: 4,
    thumb: 'image/urban2.png',
    body: '우리 학교에는 밤마다 혼자 남아 있으면 들린다는 소문이 있다...',
    detail: `실제로 친구는 늦게까지 교실에 남아 있었는데...`
  },
  // 추가 괴담 항목 생략 가능
];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('urbanList')) {
    let sortType = 'latest';
    let filterType = getParamFromURL('filter') || 'all';
    const idParam = getParamFromURL('id');

    if (idParam) {
      renderUrbanDetail(parseInt(idParam, 10));
    } else {
      renderUrbanList(sortType, filterType);
      updateUrbanTitle(filterType);
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderUrbanList(sortType, filterType);
        updateUrbanTitle(filterType);
      });
    });

    const urbanMenu = document.getElementById('urbanMenu');
    if (urbanMenu) {
      urbanMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const url = new URL(this.href);
          const newFilter = url.searchParams.get('filter') || 'all';
          filterType = newFilter;
          window.history.pushState({}, '', url.pathname + url.search);
          renderUrbanList(sortType, filterType);
          updateUrbanTitle(filterType);
        });
      });
    }

    window.addEventListener('popstate', function () {
      const idParam = getParamFromURL('id');
      filterType = getParamFromURL('filter') || 'all';
      if (idParam) {
        renderUrbanDetail(parseInt(idParam, 10));
      } else {
        renderUrbanList(sortType, filterType);
        updateUrbanTitle(filterType);
      }
    });
  }
});
