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
  onAuthStateChanged(auth, user => {
    currentUser = user;
    // 상세보기 모드라면 작성자 체크 및 액션 재실행
    if (postId) {
      checkUserLike();
      loadComments();
      renderActions();
    }
  });

  // ─── 2. URL 파라미터 헬퍼 ───────────────────────────────────────────────────────────
  function getParamFromURL(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  const postId = getParamFromURL("id");
  const boardParam = getParamFromURL("board") || "free";

  // ─── 3. DOM 요소 참조 ─────────────────────────────────────────────────────────────
  const postDetailContainer = document.getElementById("postDetail");
  const boardSelectorSection = document.querySelector(".board-selector");
  const writeForm = document.getElementById("writeForm");
  const showWriteFormBtn = document.getElementById("showWriteForm");
  const communityHeader = document.querySelector(".community-header");
  const communityList = document.getElementById("communityList");
  const boardTitle = document.getElementById("boardTitle");
  const sortButtons = document.querySelectorAll(".sort-btn");

  // ─── 4. 게시판 타이틀 설정 ─────────────────────────────────────────────────────
  boardTitle.textContent = {
    free: "자유게시판",
    notice: "이벤트/공지",
    archive: "자료실"
  }[boardParam] || "자유게시판";

  // ─── 5. 상세보기 모드 ─────────────────────────────────────────────────────────────
  if (postId) {
    // 나머지 UI 숨기기
    [boardSelectorSection, showWriteFormBtn, writeForm, communityHeader, communityList, sortButtons]
      .forEach(el => el && (el.style.display = "none"));

    // 게시글 가져와 렌더링
    getDoc(doc(db, "communityPosts", postId)).then(async snap => {
      if (!snap.exists()) {
        postDetailContainer.innerHTML = "<p>게시글을 찾을 수 없습니다.</p>";
        return;
      }
      const data = snap.data();

      // 상세 HTML 구성 (수정·삭제 버튼은 별도 div에 그릴 예정)
      postDetailContainer.innerHTML = `
        <div class="post-meta">
          <span>작성일: ${data.date}</span> |
          <span>게시판: ${data.board}</span> |
          <span>작성자: ${data.nickname}</span>
        </div>
        <h2>${data.title}</h2>
        <div class="post-body">${data.detail}</div>
        <div style="margin:1.5rem 0;">
          <button id="likeButton">❤️ 좋아요 (${data.likes})</button>
        </div>
        <hr />
        <div id="commentsSection">
          <h3>댓글</h3>
          <div id="commentList"></div>
          <textarea id="commentInput" placeholder="댓글을 입력하세요"></textarea>
          <button id="addCommentButton">댓글 작성</button>
        </div>
      `;

      // ── 5-1. 수정·삭제 버튼 영역 추가 ──────────────────────────────────────────────
      const actionsDiv = document.createElement("div");
      actionsDiv.id = "postActions";
      actionsDiv.style.margin = "1.5rem 0";
      postDetailContainer.insertBefore(actionsDiv, postDetailContainer.querySelector("hr"));

      // ── 5-2. 좋아요 버튼 로직 ────────────────────────────────────────────────────
      const likeButton = document.getElementById("likeButton");
      let userHasLiked = false;

      async function checkUserLike() {
        if (!currentUser) return;
        const likeQ = query(
          collection(db, "likes"),
          where("postId", "==", postId),
          where("uid", "==", currentUser.uid)
        );
        const likeSnap = await getDocs(likeQ);
        if (!likeSnap.empty) {
          userHasLiked = true;
          likeButton.disabled = true;
          likeButton.textContent = "❤️ 이미 좋아요를 누르셨습니다";
        }
      }

      if (currentUser) checkUserLike();

      likeButton.addEventListener("click", async () => {
        if (!currentUser) return alert("로그인이 필요합니다.");
        if (userHasLiked) return;
        await addDoc(collection(db, "likes"), { postId, uid: currentUser.uid });
        await updateDoc(doc(db, "communityPosts", postId), { likes: increment(1) });
        data.likes++;
        userHasLiked = true;
        likeButton.disabled = true;
        likeButton.textContent = "❤️ 이미 좋아요를 누르셨습니다";
      });

      // ── 5-3. 수정·삭제 버튼 렌더링 & 이벤트 바인딩 ───────────────────────────────
      function renderActions() {
        const actionsDiv = document.getElementById("postActions");
        if (!currentUser) return;
        // 작성자 본인일 때만 버튼 표시
        if (currentUser.uid === data.uid) {
          actionsDiv.innerHTML = `
            <button id="editPostBtn">게시글 수정</button>
            <button id="deletePostBtn">게시글 삭제</button>
          `;

          // 삭제
          document.getElementById("deletePostBtn").addEventListener("click", async () => {
            if (confirm("게시글을 삭제하시겠습니까?")) {
              await deleteDoc(doc(db, "communityPosts", postId));
              alert("삭제되었습니다.");
              location.href = `community.html?board=${boardParam}`;
            }
          });

          // 수정
          document.getElementById("editPostBtn").addEventListener("click", () => {
            // 기존 제목/내용 요소 가져오기
            const titleEl = postDetailContainer.querySelector("h2");
            const detailEl = postDetailContainer.querySelector(".post-body");

            // 입력 폼 요소 생성
            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.value = data.title;
            titleInput.style.width = "100%";
            titleInput.style.margin = "0.5rem 0";

            const detailTextarea = document.createElement("textarea");
            detailTextarea.value = data.detail;
            detailTextarea.style.width = "100%";
            detailTextarea.style.height = "200px";
            detailTextarea.style.margin = "0.5rem 0";

            // 화면에 교체
            titleEl.replaceWith(titleInput);
            detailEl.replaceWith(detailTextarea);

            // 저장/취소 버튼으로 바꾸기
            actionsDiv.innerHTML = `
              <button id="savePostBtn">저장</button>
              <button id="cancelEditBtn">취소</button>
            `;

            // 저장
            document.getElementById("savePostBtn").addEventListener("click", async () => {
              const newTitle = titleInput.value.trim();
              const newDetail = detailTextarea.value.trim();
              if (!newTitle || !newDetail) return alert("제목과 내용을 입력해주세요.");
              await updateDoc(doc(db, "communityPosts", postId), {
                title: newTitle,
                detail: newDetail
              });
              alert("수정되었습니다.");
              location.reload();
            });

            // 취소
            document.getElementById("cancelEditBtn").addEventListener("click", () => {
              location.reload();
            });
          });
        }
      }

      // 최초 렌더
      renderActions();

      // ── 5-4. 댓글 로드/관리 함수 ────────────────────────────────────────────────
      async function loadComments() {
        const listEl = document.getElementById("commentList");
        listEl.innerHTML = "";
        const cQ = query(collection(db, "comments"), where("postId", "==", postId));
        const cSnap = await getDocs(cQ);
        const comments = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        comments.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (!comments.length) {
          listEl.innerHTML = "<p>댓글이 없습니다.</p>";
          return;
        }

        comments.forEach(c => {
          const div = document.createElement("div");
          div.className = "comment-item";
          div.innerHTML = `
            <p><strong>${c.nickname}</strong> <small>${c.date}</small></p>
            <p id="commentText-${c.id}">${c.text}</p>
          `;
          if (currentUser && currentUser.uid === c.uid) {
            const btns = document.createElement("div");
            btns.innerHTML = `
              <button class="editBtn" data-id="${c.id}">수정</button>
              <button class="deleteBtn" data-id="${c.id}">삭제</button>
            `;
            div.appendChild(btns);
            // 삭제
            btns.querySelector(".deleteBtn").addEventListener("click", async () => {
              if (confirm("댓글을 삭제하시겠습니까?")) {
                await deleteDoc(doc(db, "comments", c.id));
                loadComments();
              }
            });
            // 수정
            btns.querySelector(".editBtn").addEventListener("click", () => {
              const textEl = document.getElementById(`commentText-${c.id}`);
              const ta = document.createElement("textarea");
              ta.value = c.text;
              const save = document.createElement("button");
              save.textContent = "저장";
              const cancel = document.createElement("button");
              cancel.textContent = "취소";
              textEl.replaceWith(ta);
              btns.replaceWith(save);
              save.after(cancel);

              save.addEventListener("click", async () => {
                const newText = ta.value.trim();
                if (!newText) return alert("댓글 내용을 입력해주세요.");
                await updateDoc(doc(db, "comments", c.id), { text: newText });
                loadComments();
              });
              cancel.addEventListener("click", loadComments);
            });
          }
          listEl.appendChild(div);
        });
      }

      loadComments();

      // 댓글 작성
      document.getElementById("addCommentButton").addEventListener("click", async () => {
        if (!currentUser) return alert("로그인이 필요합니다.");
        const ta = document.getElementById("commentInput");
        const text = ta.value.trim();
        if (!text) return alert("댓글을 입력해주세요.");
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const nickname = userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
        const date = new Date().toISOString().slice(0, 10);
        await addDoc(collection(db, "comments"), { postId, uid: currentUser.uid, nickname, text, date });
        ta.value = "";
        loadComments();
      });
    });

    return;
  }

  // ─── 6. 목록 모드 ─────────────────────────────────────────────────────────────────
  if (boardParam === "free") {
    writeForm.style.display = "none";
    showWriteFormBtn.style.display = "inline-block";
  } else {
    showWriteFormBtn.style.display = "none";
    writeForm.style.display = "none";
  }
  showWriteFormBtn.addEventListener("click", () => {
    writeForm.style.display = writeForm.style.display === "none" ? "block" : "none";
  });

  writeForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUser) return alert("로그인이 필요합니다.");
    const title = document.getElementById("writeTitle").value.trim();
    const summary = document.getElementById("writeBody").value.trim();
    const detail = document.getElementById("postDetailInput").value.trim();
    const board = document.getElementById("writeBoard").value;
    if (!title || !summary || !detail) return alert("모든 필드를 입력해주세요.");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
    const date = new Date().toISOString().slice(0, 10);
    await addDoc(collection(db, "communityPosts"), {
      title, summary, detail, board, date, likes: 0, nickname, uid: currentUser.uid
    });
    alert("게시글이 등록되었습니다.");
    location.href = `community.html?board=${board}`;
  });

  async function loadPosts(board, sort = "latest") {
    communityList.innerHTML = "";
    const q = query(collection(db, "communityPosts"), where("board", "==", board));
    const snap = await getDocs(q);
    let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    posts.sort((a, b) =>
      sort === 'popular' ? b.likes - a.likes : new Date(b.date) - new Date(a.date)
    );
    if (!posts.length) return communityList.innerHTML = "<p>게시글이 없습니다.</p>";
    posts.forEach(p => {
      const div = document.createElement("div");
      div.className = "post-item";
      div.innerHTML = `
        <h3><a href="community.html?id=${p.id}&board=${board}">${p.title}</a></h3>
        <p>${p.summary}</p>
        <div class="meta">${p.date} | ${p.nickname} | ❤️ ${p.likes}</div>
      `;
      communityList.appendChild(div);
    });
  }

  let currentSort = "latest";
  sortButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      sortButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      loadPosts(boardParam, currentSort);
    });
  });

  loadPosts(boardParam, currentSort);
});
