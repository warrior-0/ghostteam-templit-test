// community.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── 1. Firebase 초기화 ─────────────────────────────────────────────────────────────────────────
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

// ─── 2. URL 파라미터 가져오기 헬퍼 ────────────────────────────────────────────────────────────────
function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ─── 3. DOM 요소 참조 ─────────────────────────────────────────────────────────────────────────────
const postId = getParamFromURL("id"); // 상세보기 모드면 postId가 존재
const postDetailContainer = document.getElementById("postDetail");

// HTML 구조에 맞춰 실제 존재하는 요소들을 가져옵니다.
const boardSelectorSection = document.querySelector(".board-selector"); // <section class="board-selector">
const writeForm = document.getElementById("writeForm");               // <form id="writeForm">
const showWriteFormBtn = document.getElementById("showWriteForm");    // <button id="showWriteForm">
const communityHeader = document.querySelector(".community-header");   // <div class="community-header">
const communityList = document.getElementById("communityList");        // <div id="communityList">
const boardSelector = document.getElementById("boardSelector");       // <select id="boardSelector">
const boardTitle = document.getElementById("boardTitle");             // <div id="boardTitle"> within community-header
const sortButtons = document.querySelectorAll(".sort-btn");           // .sort-btn 버튼들

// ─── 4. “상세보기 모드가 아닌 경우” (목록 모드) ────────────────────────────────────────────────────
if (!postId) {
  // 4-1. 글쓰기 폼 토글 및 처리 ───────────────────────────────────────────────────────────────
  showWriteFormBtn?.addEventListener("click", () => {
    // 클릭할 때마다 폼 보이기/숨기기
    writeForm.style.display = writeForm.style.display === "none" ? "block" : "none";
  });

  writeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const title = document.getElementById("writeTitle").value.trim();
    const summary = document.getElementById("writeBody").value.trim();
    const detail = document.getElementById("postDetailInput").value.trim();
    const board = document.getElementById("writeBoard").value;

    if (!title || !summary || !detail) {
      alert("제목, 줄거리, 본문을 모두 입력해주세요.");
      return;
    }

    // users 컬렉션에서 닉네임을 가져오는 헬퍼
    async function getUserNickname(uid) {
      const userDoc = await getDoc(doc(db, "users", uid));
      return userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
    }

    const nickname = await getUserNickname(currentUser.uid);
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await addDoc(collection(db, "communityPosts"), {
      title,
      summary,
      detail,
      board,
      date: dateStr,
      likes: 0,
      nickname,
      uid: currentUser.uid
    });

    alert("게시글이 등록되었습니다.");
    // 새로 등록된 글이 포함된 게시판으로 강제 리로드
    location.href = `community.html?board=${board}`;
  });

  // 4-2. 게시글 목록 불러오기 & 렌더링 함수 정의 ───────────────────────────────────────────────
  async function loadPosts(board, sort = "latest") {
    communityList.innerHTML = "";

    // board 필터(paremetrized)로 communityPosts 컬렉션에서 문서 가져오기
    const q = query(collection(db, "communityPosts"), where("board", "==", board));
    const snapshot = await getDocs(q);

    let posts = [];
    snapshot.forEach((docSnap) => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });

    // 정렬: 인기순 vs 최신순
    posts.sort((a, b) => {
      if (sort === "popular") {
        return b.likes - a.likes;
      } else {
        return new Date(b.date) - new Date(a.date);
      }
    });

    if (posts.length === 0) {
      communityList.innerHTML = "<p>게시글이 없습니다.</p>";
      return;
    }

    // 각 게시물(item)을 화면에 뿌려주기
    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "post-item";
      div.innerHTML = `
        <h3>
          <a href="community.html?id=${post.id}&board=${board}">${post.title}</a>
        </h3>
        <p>${post.summary}</p>
        <div class="meta">
          ${post.date} | ${post.nickname} | ❤️ ${post.likes}
        </div>
      `;
      communityList.appendChild(div);
    });
  }

  // 4-3. 게시판 및 정렬 버튼 초기화 & 이벤트 연결 ─────────────────────────────────────────────
  const boardParam = getParamFromURL("board") || "free";
  boardSelector.value = boardParam;
  boardTitle.textContent =
    {
      free: "자유게시판",
      notice: "이벤트/공지",
      archive: "자료실"
    }[boardParam] || "자유게시판";

  // 정렬 버튼 클릭 시 active 클래스 토글 후 재호출
  let currentSort = "latest";
  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sortButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      loadPosts(boardParam, currentSort);
    });
  });

  // 최초 로드: 게시판 목록
  loadPosts(boardParam, currentSort);

  // 게시판 선택(select) 변경 시 다른 게시판으로 이동
  boardSelector?.addEventListener("change", (e) => {
    const newBoard = e.target.value;
    location.href = `community.html?board=${newBoard}`;
  });
}


// ─── 5. 상세보기 모드(postId가 있을 때) ───────────────────────────────────────────────────────────
if (postId && postDetailContainer) {
  // (A) 상세보기 모드일 때: 상단 게시판 선택, 글쓰기 폼, 커뮤니티 헤더(제목/정렬), 목록을 숨김
  if (boardSelectorSection) boardSelectorSection.style.display = "none";
  if (writeForm) writeForm.style.display = "none";
  if (communityHeader) communityHeader.style.display = "none";
  if (communityList) communityList.style.display = "none";

  // (B) 해당 게시글 데이터 가져오기 & 렌더링
  getDoc(doc(db, "communityPosts", postId)).then(async (docSnap) => {
    if (!docSnap.exists()) {
      postDetailContainer.innerHTML = "<p>게시글을 찾을 수 없습니다.</p>";
      return;
    }

    const data = docSnap.data();

    // 상세보기 화면 구성: 메타정보, 제목, 본문, 좋아요 버튼, 댓글 섹션
    postDetailContainer.innerHTML = `
      <div class="post-meta">
        <span>작성일: ${data.date}</span> |
        <span>게시판: ${data.board}</span> |
        <span>작성자: ${data.nickname}</span>
      </div>
      <h2 style="margin-top:1rem;">${data.title}</h2>
      <div class="post-body" style="margin-top:1rem; line-height:1.6;">
        ${data.detail}
      </div>

      <div style="margin-top:1.5rem;">
        <button id="likeButton">❤️ 좋아요 (${data.likes})</button>
      </div>

      <hr style="margin:2rem 0;" />

      <div id="commentsSection">
        <h3>댓글</h3>
        <div id="commentList"></div>
        <textarea id="commentInput" placeholder="댓글을 입력하세요" style="width:100%; height:4rem; margin-top:0.5rem;"></textarea>
        <button id="addCommentButton" style="margin-top:0.5rem;">댓글 작성</button>
      </div>
    `;

    // ── 좋아요 버튼 로직 ─────────────────────────────────────────────────────────────────────
    const likeButton = document.getElementById("likeButton");
    likeButton?.addEventListener("click", async () => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
      }
      const postRef = doc(db, "communityPosts", postId);
      await updateDoc(postRef, { likes: data.likes + 1 });
      data.likes += 1;
      likeButton.textContent = `❤️ 좋아요 (${data.likes})`;
    });

    // ── 댓글 로딩 함수 ──────────────────────────────────────────────────────────────────────────
    async function loadComments() {
      const commentListEl = document.getElementById("commentList");
      commentListEl.innerHTML = "";

      const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId));
      const commentSnap = await getDocs(commentsQuery);
      let comments = [];
      commentSnap.forEach((cSnap) => {
        comments.push({ id: cSnap.id, ...cSnap.data() });
      });
      comments.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (comments.length === 0) {
        commentListEl.innerHTML = "<p>댓글이 없습니다.</p>";
        return;
      }

      comments.forEach((comment) => {
        const div = document.createElement("div");
        div.className = "comment-item";
        div.style = "border-bottom:1px solid #ddd; padding:0.5rem 0;";

        let commentHTML = `
          <p style="margin:0;">
            <strong>${comment.nickname}</strong>
            <span style="color:#888; font-size:0.9rem; margin-left:0.5rem;">
              ${comment.date}
            </span>
          </p>
          <p id="commentText-${comment.id}" style="margin:0.3rem 0;">
            ${comment.text}
          </p>
        `;

        // 작성자가 본인이면 “수정/삭제” 버튼 노출
        if (currentUser && currentUser.uid === comment.uid) {
          commentHTML += `
            <button class="editCommentBtn" data-id="${comment.id}" style="font-size:0.8rem; margin-right:0.5rem;">
              수정
            </button>
            <button class="deleteCommentBtn" data-id="${comment.id}" style="font-size:0.8rem;">
              삭제
            </button>
          `;
        }

        div.innerHTML = commentHTML;
        commentListEl.appendChild(div);

        // 삭제 로직
        if (currentUser && currentUser.uid === comment.uid) {
          const deleteBtn = div.querySelector(`.deleteCommentBtn[data-id="${comment.id}"]`);
          deleteBtn?.addEventListener("click", async () => {
            if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;
            await deleteDoc(doc(db, "comments", comment.id));
            loadComments();
          });
        }

        // 수정 로직
        if (currentUser && currentUser.uid === comment.uid) {
          const editBtn = div.querySelector(`.editCommentBtn[data-id="${comment.id}"]`);
          editBtn?.addEventListener("click", () => {
            const originalTextEl = document.getElementById(`commentText-${comment.id}`);
            const originalText = originalTextEl.textContent;
            const editTextarea = document.createElement("textarea");
            editTextarea.id = `editCommentInput-${comment.id}`;
            editTextarea.style = "width:100%; height:3rem; margin:0.3rem 0;";
            editTextarea.value = originalText;

            const saveBtn = document.createElement("button");
            saveBtn.textContent = "저장";
            saveBtn.style = "font-size:0.8rem; margin-right:0.5rem;";

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "취소";
            cancelBtn.style = "font-size:0.8rem;";

            const parentDiv = originalTextEl.parentElement;
            parentDiv.replaceChild(editTextarea, originalTextEl);
            parentDiv.querySelectorAll("button").forEach((b) => b.remove());
            parentDiv.appendChild(saveBtn);
            parentDiv.appendChild(cancelBtn);

            saveBtn.addEventListener("click", async () => {
              const newText = editTextarea.value.trim();
              if (!newText) {
                alert("댓글 내용을 입력해주세요.");
                return;
              }
              await updateDoc(doc(db, "comments", comment.id), { text: newText });
              loadComments();
            });

            cancelBtn.addEventListener("click", () => {
              loadComments();
            });
          });
        }
      });
    }

    // 최초 댓글 로딩
    loadComments();

    // ── 댓글 추가 로직 ────────────────────────────────────────────────────────────────────────────
    const addCommentButton = document.getElementById("addCommentButton");
    addCommentButton?.addEventListener("click", async () => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
      }
      const commentInput = document.getElementById("commentInput");
      const text = commentInput.value.trim();
      if (!text) {
        alert("댓글을 입력해주세요.");
        return;
      }

      async function getUserNickname(uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        return userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
      }
      const nickname = await getUserNickname(currentUser.uid);
      const dateStr = new Date().toISOString().slice(0, 10);

      await addDoc(collection(db, "comments"), {
        postId,
        uid: currentUser.uid,
        nickname,
        text,
        date: dateStr
      });

      commentInput.value = "";
      loadComments();
    });
  });
}
