// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 올바른 storage bucket 주소로 수정
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
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// ===== 공통 로그인 UI & 상태 일원화 =====
function renderAuthUI(user) {
  const authDiv = document.getElementById("authControl");
  if (!authDiv) return;
  authDiv.innerHTML = "";
  const btn = document.createElement("button");
  btn.style.background = "#222";
  btn.style.color = "#fafafa";
  btn.style.border = "none";
  btn.style.padding = "0.4rem 1rem";
  btn.style.borderRadius = "20px";
  btn.style.fontSize = "0.95rem";
  btn.style.cursor = "pointer";
  btn.style.marginLeft = "1rem";
  btn.style.transition = "background 0.2s";
  if (user) {
    btn.textContent = "로그아웃";
    btn.onclick = async () => {
      await signOut(auth);
    };
  } else {
    btn.textContent = "로그인";
    btn.onclick = () => window.location.href = "login.html";
  }
  authDiv.appendChild(btn);
}

// ===== 커뮤니티 게시판 Firestore 기반 통합 =====

const boardTitles = {
  free: '자유게시판',
  notice: '이벤트/공지',
  archive: '자료실'
};

async function fetchPosts(boardType = "free", sortType = "latest") {
  let q = query(collection(db, "posts"));
  if (boardType && boardType !== "all") {
    q = query(q, where("board", "==", boardType));
  }
  if (sortType === "latest") {
    q = query(q, orderBy("created", "desc"));
  } else if (sortType === "popular") {
    q = query(q, orderBy("likes", "desc"));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, s =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[s])
  );
}

function updateCommunityTitle(boardType) {
  const titleElem = document.querySelector('.community-title');
  if (titleElem) {
    titleElem.textContent = boardTitles[boardType] || boardType || '자유게시판';
  }
}

async function renderCommunityList(sortType, boardType) {
  const list = await fetchPosts(boardType, sortType);
  const communityList = document.getElementById('communityList');
  if (!communityList) return;
  if (list.length === 0) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
  } else {
    communityList.innerHTML =
      list.map(item => `
        <div class="community-item" data-id="${item.id}" style="cursor:pointer;">
          <div class="community-item-title">${escapeHTML(item.title)}</div>
          <div class="community-item-meta">
            <span>좋아요 ${item.likes || 0}개</span>
            <span>${item.created?.toDate?.().toLocaleDateString?.("ko-KR") || ""}</span>
            <span>${boardTitles[item.board] || "자유게시판"}</span>
          </div>
          <div class="community-item-body">${escapeHTML(item.body || "")}</div>
        </div>
      `).join('');
    // 클릭 이벤트 등록(상세보기)
    document.querySelectorAll('.community-item').forEach(itemElem => {
      itemElem.addEventListener('click', function(){
        const clickId = this.getAttribute('data-id');
        window.history.pushState({}, '', `?id=${clickId}`);
        renderCommunityDetail(clickId);
      });
    });
  }
}

async function renderCommunityDetail(id) {
  const communityList = document.getElementById('communityList');
  const docRef = doc(db, "posts", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.exists() ? docSnap.data() : null;
  if (!data) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
    updateCommunityTitle('자유게시판');
    return;
  }
  const titleElem = document.querySelector('.community-title');
  if (titleElem) titleElem.textContent = data.title;

  communityList.innerHTML = `
    <div class="community-item community-detail">
      <div class="community-item-title" style="font-size:1.5rem;">${escapeHTML(data.title)}</div>
      <div class="community-item-meta">
        <span>좋아요 ${data.likes || 0}개</span>
        <span>${data.created?.toDate?.().toLocaleDateString?.("ko-KR") || ""}</span>
        <span>${boardTitles[data.board] || "자유게시판"}</span>
      </div>
      <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${escapeHTML(data.body || "")}</div>
      <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
    </div>
  `;
  document.querySelector('.community-back-btn').addEventListener('click', function(){
    window.history.back();
  });
}

// 글쓰기
async function createPost(event) {
  event.preventDefault();
  if (!currentUser) {
    alert('로그인 후 작성 가능합니다.');
    return;
  }
  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  if (!title || !body) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";

  await addDoc(collection(db, "posts"), {
    title,
    body,
    board: getBoardFromURL() || "free",
    likes: 0,
    authorUid: currentUser.uid,
    authorname: nickname,
    created: new Date()
  });
  alert("작성 완료!");
  document.getElementById("postForm").reset();
  renderCommunityList("latest", getBoardFromURL() || "free");
}

function getBoardFromURL() {
  return new URLSearchParams(window.location.search).get('board') || 'free';
}

function getIdFromURL() {
  return new URLSearchParams(window.location.search).get('id');
}

// ===== 페이지 초기화 및 이벤트 바인딩 =====
document.addEventListener("DOMContentLoaded", () => {
  // Auth UI 일원화
  onAuthStateChanged(auth, user => {
    currentUser = user;
    renderAuthUI(user);
    // 글쓰기 폼 노출
    const writeSection = document.getElementById("postWriteSection");
    if (writeSection) writeSection.style.display = user ? "block" : "none";
  });

  // 커뮤니티 게시판
  if (document.getElementById('communityList')) {
    let sortType = 'latest';
    let boardType = getBoardFromURL();
    const idParam = getIdFromURL();
    if (idParam) {
      renderCommunityDetail(idParam);
    } else {
      renderCommunityList(sortType, boardType);
      updateCommunityTitle(boardType);
    }

    // 정렬 버튼
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function(){
        document.querySelectorAll('.sort-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      });
    });

    // 세부 메뉴 클릭시 (드롭다운 메뉴)
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

    // 글쓰기 폼
    const postForm = document.getElementById("postForm");
    if (postForm) {
      postForm.addEventListener("submit", createPost);
    }

    // 뒤로가기/앞으로가기 지원
    window.addEventListener('popstate', function() {
      const idParam = getIdFromURL();
      boardType = getBoardFromURL();
      if (idParam) {
        renderCommunityDetail(idParam);
      } else {
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      }
    });
  }
});
