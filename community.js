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
  where,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("[community.js] DOMContentLoaded 접속");

  // ─── 1. Firebase 초기화 ─────────────────────────────────────────────────────────
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
    console.log("[Auth] 현재 사용자:", currentUser ? currentUser.email : "없음");
    // 만약 상세보기 모드에 진입했고, 좋아요 체크가 아직 안 됐으면 재실행
    if (postId && currentUser) checkUserLike(); 
  });

  // ─── 2. URL 파라미터 가져오기 헬퍼 ───────────────────────────────────────────────────────
  function getParamFromURL(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ─── 3. DOM 요소 참조 ─────────────────────────────────────────────────────────────────────
  const postId = getParamFromURL("id");                  // 상세보기 모드인지 판별
  const boardParam = getParamFromURL("board") || "free"; // 없으면 기본 "free"

  const postDetailContainer = document.getElementById("postDetail");      // 상세보기 영역
  const boardSelectorSection = document.querySelector(".board-selector"); // 글쓰기 버튼만 있는 섹션
  const writeForm = document.getElementById("writeForm");                // 글쓰기 폼 전체
  const showWriteFormBtn = document.getElementById("showWriteForm");     // “글쓰기” 버튼
  const communityHeader = document.querySelector(".community-header");    // 제목·정렬 버튼 섹션
  const communityList = document.getElementById("communityList");         // 게시글 목록 영역
  const boardTitle = document.getElementById("boardTitle");              // “자유게시판” 등 타이틀
  const sortButtons = document.querySelectorAll(".sort-btn");            // 최신순/인기순 버튼들

  // 요소가 제대로 선택되었는지 확인
  console.log("[community.js] postDetailContainer:", postDetailContainer);
  console.log("[community.js] boardSelectorSection:", boardSelectorSection);
  console.log("[community.js] writeForm:", writeForm);
  console.log("[community.js] showWriteFormBtn:", showWriteFormBtn);
  console.log("[community.js] communityHeader:", communityHeader);
  console.log("[community.js] communityList:", communityList);
  console.log("[community.js] boardTitle:", boardTitle);
  console.log("[community.js] sortButtons 개수:", sortButtons.length);

  // ─── 4. 게시판 제목(boardTitle) 설정 ─────────────────────────────────────────────────────
  boardTitle.textContent =
    {
      free: "자유게시판",
      notice: "이벤트/공지",
      archive: "자료실"
    }[boardParam] || "자유게시판";
  console.log("[community.js] boardParam:", boardParam);

  // ─── 5. 상세보기 모드 분기 ──────────────────────────────────────────────────────────────────
  if (postId) {
    console.log("[community.js] 상세보기 모드 진입 (postId:", postId, ")");

    // (A) 상세보기 모드일 때: 나머지 섹션 모두 숨기기
    if (boardSelectorSection) boardSelectorSection.style.display = "none";
    if (showWriteFormBtn) showWriteFormBtn.style.display = "none";
    if (writeForm) writeForm.style.display = "none";
    if (communityHeader) communityHeader.style.display = "none";
    if (communityList) communityList.style.display = "none";

    // (B) 해당 게시글 데이터 가져오고 렌더링
    getDoc(doc(db, "communityPosts", postId)).then(async (docSnap) => {
      if (!docSnap.exists()) {
        postDetailContainer.innerHTML = "<p>게시글을 찾을 수 없습니다.</p>";
        return;
      }

      const data = docSnap.data();
      console.log("[community.js] 상세 게시글 데이터:", data);

      // 상세보기 화면 구성(메타정보 + 본문 + 좋아요 + 댓글 섹션)
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
        // ─── 게시글 수정/삭제 버튼 (본인 게시글일 경우) ──────────────────────────────
if (currentUser && currentUser.uid === data.uid) {
  const controlDiv = document.createElement("div");
  controlDiv.style = "margin-top: 1.5rem;";
  controlDiv.innerHTML = `
    <button id="editPostBtn" style="margin-right:1rem;">✏️ 게시글 수정</button>
    <button id="deletePostBtn">🗑️ 게시글 삭제</button>
  `;
  postDetailContainer.appendChild(controlDiv);

  // 게시글 삭제
  document.getElementById("deletePostBtn").addEventListener("click", async () => {
    const confirmed = confirm("정말 이 게시글을 삭제하시겠습니까?");
    if (!confirmed) return;
    await deleteDoc(doc(db, "communityPosts", postId));
    alert("게시글이 삭제되었습니다.");
    location.href = `community.html?board=${data.board}`;
  });

  // 게시글 수정
  document.getElementById("editPostBtn").addEventListener("click", () => {
    postDetailContainer.innerHTML = `
      <div class="post-meta">
        <span>작성일: ${data.date}</span> |
        <span>게시판: ${data.board}</span> |
        <span>작성자: ${data.nickname}</span>
      </div>
      <input id="editTitle" type="text" value="${data.title}" style="width:100%; margin-top:1rem; font-size:1.2rem;" />
      <textarea id="editDetail" style="width:100%; height:10rem; margin-top:1rem;">${data.detail}</textarea>
      <div style="margin-top:1rem;">
        <button id="saveEditBtn" style="margin-right:0.5rem;">저장</button>
        <button id="cancelEditBtn">취소</button>
      </div>
    `;

    document.getElementById("saveEditBtn").addEventListener("click", async () => {
      const newTitle = document.getElementById("editTitle").value.trim();
      const newDetail = document.getElementById("editDetail").value.trim();
      if (!newTitle || !newDetail) {
        alert("제목과 본문을 모두 입력해주세요.");
        return;
      }

      await updateDoc(doc(db, "communityPosts", postId), {
        title: newTitle,
        detail: newDetail
      });

      alert("수정이 완료되었습니다.");
      location.reload();
    });

    document.getElementById("cancelEditBtn").addEventListener("click", () => {
      location.reload();
    });
  });
}

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

      // ── 좋아요 버튼 로직(한 번만 가능) ────────────────────────────────────────────────────
      const likeButton = document.getElementById("likeButton");
      let userHasLiked = false;

      // (1) 현재 사용자가 이미 좋아요했는지 확인 (likes 컬렉션)
      async function checkUserLike() {
        if (!currentUser) return;
        console.log("[community.js] 좋아요 중복 체크 시작(postId, uid):", postId, currentUser.uid);
        const likeQuery = query(
          collection(db, "likes"),
          where("postId", "==", postId),
          where("uid", "==", currentUser.uid)
        );
        const likeSnap = await getDocs(likeQuery);
        if (!likeSnap.empty) {
          userHasLiked = true;
          likeButton.disabled = true;
          likeButton.textContent = "❤️ 이미 좋아요";
          console.log("[community.js] 이미 좋아요 기록이 존재하여 버튼 비활성화");
        }
      }

      // 현재 로그인 상태면 즉시 체크, 아니면 상태 변경 콜백에서 체크
      if (currentUser) {
        checkUserLike();
      } else {
        onAuthStateChanged(auth, (user) => {
          currentUser = user;
          if (user) checkUserLike();
        });
      }

      // (2) 좋아요 클릭 시
      likeButton?.addEventListener("click", async () => {
        console.log("[community.js] 좋아요 버튼 클릭 시도");
        if (!currentUser) {
          alert("로그인이 필요합니다.");
          return;
        }
        if (userHasLiked) {
          alert("이미 좋아요를 누르셨습니다.");
          return;
        }
        console.log("[community.js] 좋아요 처리: likes 컬렉션 추가 + communityPosts.likes 증가");

        // (a) likes 컬렉션에 기록 추가
        await addDoc(collection(db, "likes"), {
          postId,
          uid: currentUser.uid
        });

        // (b) communityPosts/{postId}.likes 필드 1 증가
        const postRef = doc(db, "communityPosts", postId);
        await updateDoc(postRef, { likes: increment(1) });

        data.likes += 1;
        userHasLiked = true;
        likeButton.disabled = true;
        likeButton.textContent = "❤️ 이미 좋아요를 누르셨습니다";
      });

      // ── 댓글 로딩 함수 ──────────────────────────────────────────────────────────────────
      async function loadComments() {
        console.log("[community.js] loadComments 호출");
        const commentListEl = document.getElementById("commentList");
        commentListEl.innerHTML = ""; // 초기화

        const commentsQuery = query(collection(db, "comments"), where("postId", "==", postId));
        const commentSnap = await getDocs(commentsQuery);
        let comments = [];
        commentSnap.forEach((cSnap) => {
          comments.push({ id: cSnap.id, ...cSnap.data() });
        });
        // 작성일 오름차순 정렬
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

          // 본인 댓글이면 수정/삭제 버튼 추가
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

          // 댓글 삭제 로직
          if (currentUser && currentUser.uid === comment.uid) {
            const deleteBtn = div.querySelector(`.deleteCommentBtn[data-id="${comment.id}"]`);
            deleteBtn?.addEventListener("click", async () => {
              if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) return;
              await deleteDoc(doc(db, "comments", comment.id));
              loadComments();
            });
          }

          // 댓글 수정 로직
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

      // ── 댓글 추가 로직 ▽────────────────────────────────────────────────────────────────────────
      const addCommentButton = document.getElementById("addCommentButton");
      addCommentButton?.addEventListener("click", async () => {
        console.log("[community.js] 댓글 작성 버튼 클릭");
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

        // users/{uid} 에서 닉네임 조회
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

    return; // 상세보기 모드이므로 목록·글쓰기 로직으로 내려가지 않음
  }

  // ─── 6. 목록 모드일 때(= postId가 없을 때) ─────────────────────────────────────────────────────
  console.log("[community.js] 목록 모드 진입 (postId 없음)");
  // (A) “글쓰기” 버튼 & 폼 노출 여부 결정
  if (boardParam === "free") {
    // 자유게시판 또는 이벤트/공지인 경우 버튼만 보이게 → 폼은 초기 hidden
    if (writeForm) writeForm.style.display = "none";
    if (showWriteFormBtn) showWriteFormBtn.style.display = "inline-block";
  } else {
    // 자료실 등인 경우 모두 숨김
    if (showWriteFormBtn) showWriteFormBtn.style.display = "none";
    if (writeForm) writeForm.style.display = "none";
  }

  // (B) 글쓰기 폼 토글 및 제출 처리
  showWriteFormBtn?.addEventListener("click", () => {
    console.log("[community.js] 글쓰기 버튼 클릭 → 폼 토글");
    writeForm.style.display = writeForm.style.display === "none" ? "block" : "none";
  });

  writeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[community.js] 글쓰기 폼 제출 시도");
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

    // users/{uid} 에서 닉네임 조회
    async function getUserNickname(uid) {
      const userDoc = await getDoc(doc(db, "users", uid));
      return userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
    }
    const nickname = await getUserNickname(currentUser.uid);
    const dateStr = new Date().toISOString().slice(0, 10);

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
    location.href = `community.html?board=${board}`;
  });

  // (C) 게시글 목록 불러오기 & 렌더링 함수 정의
  async function loadPosts(board, sort = "latest") {
    console.log("[community.js] loadPosts 호출, board:", board, "sort:", sort);
    communityList.innerHTML = "";

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

  // (D) 정렬 버튼 초기화 & 이벤트 연결
  let currentSort = "latest";
  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sortButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      loadPosts(boardParam, currentSort);
    });
  });

  // (E) 최초 로드: 게시판 목록 렌더링
  loadPosts(boardParam, currentSort);
});
