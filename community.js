// Firestore 기반 커뮤니티 목록/상세/댓글/좋아요 전체 구현 (글쓰기 포함)
// 기존 코드와 충돌 없이 글쓰기, 좋아요, 댓글 기능 모두 포함

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
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore();
const auth = getAuth();

let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
  document.getElementById("writeSection").style.display = user ? "block" : "none";
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
  if (titleElem) titleElem.textContent = boardTitles[boardTypeOrTitle] || boardTypeOrTitle || '자유게시판';
}

// 게시글 목록
async function renderCommunityList(sortType, boardType) {
  const communityList = document.getElementById('communityList');
  const commentSection = document.getElementById('commentSection');
  if (commentSection) commentSection.style.display = "none";
  let q = collection(db, "posts");
  let arr = [];
  let snap = await getDocs(q);
  snap.forEach(doc => arr.push({ ...doc.data(), id: doc.id }));
  if (boardType && boardType !== 'all') arr = arr.filter(x => x.board === boardType);
  if (sortType === "popular") arr.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  else arr.sort((a, b) => (b.created?.seconds || 0) - (a.created?.seconds || 0));
  if (!arr.length) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
    return;
  }
  communityList.innerHTML = arr.map(data => `
    <div class="community-item" data-id="${data.id}" style="cursor:pointer;">
      <div class="community-item-title">${data.title}</div>
      <div class="community-item-meta">
        <span>좋아요 <span class="like-count">${data.likeCount || 0}</span>개</span>
        <span>${data.created ? new Date(data.created.seconds * 1000).toISOString().slice(0, 10) : ""}</span>
        <span>${boardTitles[data.board]}</span>
      </div>
      <div class="community-item-body">${data.body || ""}</div>
    </div>
  `).join("");
  document.querySelectorAll('.community-item').forEach(itemElem => {
    itemElem.addEventListener('click', function () {
      const clickId = this.getAttribute('data-id');
      window.history.pushState({}, '', `?id=${clickId}`);
      renderCommunityDetail(clickId);
    });
  });
}

// 게시글 상세/수정/삭제/좋아요
async function renderCommunityDetail(id) {
  const communityList = document.getElementById('communityList');
  const commentSection = document.getElementById('commentSection');
  if (commentSection) commentSection.style.display = "block";
  const docRef = doc(db, "posts", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
    commentSection.style.display = "none";
    return;
  }
  const data = docSnap.data();
  let isMine = currentUser && currentUser.uid === data.authorUid;
  // 좋아요 여부
  let isLiked = false;
  if (currentUser) {
    const likeDoc = await getDoc(doc(db, "likes", id + "_" + currentUser.uid));
    isLiked = likeDoc.exists();
  }
  communityList.innerHTML = `
    <div class="community-item community-detail">
      <div class="community-item-title" style="font-size:1.5rem;">${data.title}</div>
      <div class="community-item-meta">
        <span>좋아요 <span class="like-count">${data.likeCount || 0}</span>개</span>
        <span>${data.created ? new Date(data.created.seconds * 1000).toISOString().slice(0, 10) : ""}</span>
        <span>${boardTitles[data.board]}</span>
      </div>
      <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.body || ""}</div>
      <div style="margin-top:1rem;">
        <button id="likeBtn" style="background:${isLiked ? "#e01c1c" : "#222"};color:#fafafa;border:none;padding:0.6rem 1.3rem;border-radius:8px;cursor:pointer;">${isLiked ? "♥" : "♡"} 좋아요</button>
        ${isMine ? `
          <button id="editBtn" style="background:#444;margin-left:8px;color:#fff;border:none;padding:0.5rem 1.1rem;border-radius:7px;cursor:pointer;">수정</button>
          <button id="delBtn" style="background:#e01c1c;margin-left:8px;color:#fff;border:none;padding:0.5rem 1.1rem;border-radius:7px;cursor:pointer;">삭제</button>
        ` : ""}
        <button class="community-back-btn" style="margin-left:8px;background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
      </div>
      <div id="editArea" style="margin-top:1.3rem;display:none;"></div>
    </div>
  `;
  document.querySelector('.community-back-btn').onclick = () => window.history.back();
  // 좋아요
  document.getElementById('likeBtn').onclick = async function () {
    if (!currentUser) return alert("로그인 후 이용 가능합니다.");
    const likeRef = doc(db, "likes", id + "_" + currentUser.uid);
    const postRef = doc(db, "posts", id);
    const likeDoc = await getDoc(likeRef); let likeCount = data.likeCount || 0;
    if (likeDoc.exists()) {
      await deleteDoc(likeRef);
      likeCount = Math.max(0, likeCount - 1);
      await updateDoc(postRef, { likeCount });
      this.style.background = "#222"; this.innerText = "♡ 좋아요";
    } else {
      await setDoc(likeRef, { postId: id, uid: currentUser.uid, timestamp: new Date() });
      likeCount++;
      await updateDoc(postRef, { likeCount });
      this.style.background = "#e01c1c"; this.innerText = "♥ 좋아요";
    }
    document.querySelector('.like-count').innerText = likeCount;
  };
  // 수정/삭제
  if (isMine) {
    document.getElementById('editBtn').onclick = async function () {
      const editArea = document.getElementById('editArea');
      editArea.innerHTML = `
        <form id="editForm">
          <input type="text" id="editTitle" value="${data.title}" required style="width:99%;margin-bottom:0.5rem;"/>
          <textarea id="editBody" required style="width:99%;height:80px;">${data.body || ""}</textarea>
          <button type="submit" style="background:#e01c1c;color:#fff;border:none;padding:0.5rem 1.2rem;border-radius:6px;">수정완료</button>
        </form>
      `;
      editArea.style.display = "block";
      document.getElementById('editForm').onsubmit = async function (e) {
        e.preventDefault();
        await updateDoc(doc(db, "posts", id), {
          title: document.getElementById('editTitle').value,
          body: document.getElementById('editBody').value
        });
        editArea.style.display = "none";
        renderCommunityDetail(id);
      };
    };
    document.getElementById('delBtn').onclick = async function () {
      if (confirm("정말 삭제할까요?")) {
        await deleteDoc(doc(db, "posts", id));
        window.history.back();
      }
    };
  }
  // 댓글
  loadComments(id);
  document.getElementById('commentForm').onsubmit = async function (e) {
    e.preventDefault();
    await submitComment(id);
  };
}

// 게시글 작성 (글쓰기 기능)
document.getElementById('writeForm').onsubmit = async function (e) {
  e.preventDefault();
  if (!currentUser) return alert("로그인 후 작성 가능");
  const t = document.getElementById("writeTitle").value.trim();
  const b = document.getElementById("writeBody").value.trim();
  const board = document.getElementById("writeBoard").value;
  if (!t || !b) return alert("제목/내용 입력");
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
  await addDoc(collection(db, "posts"), {
    title: t, body: b, board,
    authorUid: currentUser.uid,
    authorEmail: currentUser.email,
    authorname: nickname,
    created: serverTimestamp(),
    likeCount: 0
  });
  document.getElementById("writeTitle").value = "";
  document.getElementById("writeBody").value = "";
  renderCommunityList('latest', board);
};

// 댓글
async function loadComments(postId) {
  const commentList = document.getElementById("commentList");
  commentList.innerHTML = "";
  const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.style.marginBottom = "0.7rem";
    li.innerHTML = `<strong>${data.authorname || "익명"}</strong>: ${data.comment}`;
    if (currentUser && data.uid === currentUser.uid) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "삭제"; delBtn.style.marginLeft = "0.8rem";
      delBtn.onclick = async () => { if (confirm("댓글을 삭제?")) { await deleteDoc(doc(db, "comments", docSnap.id)); loadComments(postId); } };
      li.appendChild(delBtn);
    }
    commentList.appendChild(li);
  });
}
async function submitComment(postId) {
  if (!currentUser) return alert("로그인 후 댓글 작성");
  const commentInput = document.getElementById("comment");
  const comment = commentInput.value.trim();
  if (!comment) return alert("댓글을 입력해주세요.");
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
  await addDoc(collection(db, "comments"), {
    postId, comment, authorname: nickname, uid: currentUser.uid, timestamp: new Date()
  });
  commentInput.value = "";
  loadComments(postId);
}

// 진입/정렬/목록/뒤로가기
document.addEventListener('DOMContentLoaded', () => {
  let sortType = 'latest';
  let boardType = getParamFromURL('board') || 'free';
  const idParam = getParamFromURL('id');
  if (idParam) renderCommunityDetail(idParam);
  else { renderCommunityList(sortType, boardType); updateCommunityTitle(boardType); }
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
    if (idParam) renderCommunityDetail(idParam);
    else { renderCommunityList(sortType, boardType); updateCommunityTitle(boardType); }
  });
});
