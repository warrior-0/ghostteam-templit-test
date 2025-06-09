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

  const postId = getParamFromURL("id");
  const boardParam = getParamFromURL("board") || "free";

  const postDetailContainer = document.getElementById("postDetail");
  const boardSelectorSection = document.querySelector(".board-selector");
  const writeForm = document.getElementById("writeForm");
  const showWriteFormBtn = document.getElementById("showWriteForm");
  const communityHeader = document.querySelector(".community-header");
  const communityList = document.getElementById("communityList");
  const boardTitle = document.getElementById("boardTitle");
  const sortButtons = document.querySelectorAll(".sort-btn");

  function getParamFromURL(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (postId && currentUser) checkUserLike();
  });

  boardTitle.textContent = {
    free: "자유게시판",
    notice: "이벤트/공지",
    archive: "자료실"
  }[boardParam] || "자유게시판";

  if (postId) {
    if (boardSelectorSection) boardSelectorSection.style.display = "none";
    if (showWriteFormBtn) showWriteFormBtn.style.display = "none";
    if (writeForm) writeForm.style.display = "none";
    if (communityHeader) communityHeader.style.display = "none";
    if (communityList) communityList.style.display = "none";

    getDoc(doc(db, "communityPosts", postId)).then(async (docSnap) => {
      if (!docSnap.exists()) {
        postDetailContainer.innerHTML = "<p>게시글을 찾을 수 없습니다.</p>";
        return;
      }

      const data = docSnap.data();
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

      if (currentUser && currentUser.uid === data.uid) {
        const controlDiv = document.createElement("div");
        controlDiv.style = "margin-top: 1.5rem;";
        controlDiv.innerHTML = `
          <button id="editPostBtn" style="margin-right:1rem;">수정</button>
          <button id="deletePostBtn">삭제</button>
        `;
        postDetailContainer.appendChild(controlDiv);

        document.getElementById("deletePostBtn").addEventListener("click", async () => {
          if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
          await deleteDoc(doc(db, "communityPosts", postId));
          alert("게시글이 삭제되었습니다.");
          location.href = `community.html?board=${data.board}`;
        });

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
    });

    return;
  }

  // 목록 모드 처리 (이전과 동일하게 유지)
  if (boardParam === "free") {
    if (writeForm) writeForm.style.display = "none";
    if (showWriteFormBtn) showWriteFormBtn.style.display = "inline-block";
  } else {
    if (showWriteFormBtn) showWriteFormBtn.style.display = "none";
    if (writeForm) writeForm.style.display = "none";
  }

  showWriteFormBtn?.addEventListener("click", () => {
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

    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const nickname = userDoc.exists() ? userDoc.data().nickname || "익명" : "익명";
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

  async function loadPosts(board, sort = "latest") {
    communityList.innerHTML = "";
    const q = query(collection(db, "communityPosts"), where("board", "==", board));
    const snapshot = await getDocs(q);
    let posts = [];
    snapshot.forEach((docSnap) => {
      posts.push({ id: docSnap.id, ...docSnap.data() });
    });
    posts.sort((a, b) => sort === "popular" ? b.likes - a.likes : new Date(b.date) - new Date(a.date));

    if (posts.length === 0) {
      communityList.innerHTML = "<p>게시글이 없습니다.</p>";
      return;
    }

    posts.forEach((post) => {
      const div = document.createElement("div");
      div.className = "post-item";
      div.innerHTML = `
        <h3><a href="community.html?id=${post.id}&board=${board}">${post.title}</a></h3>
        <p>${post.summary}</p>
        <div class="meta">
          ${post.date} | ${post.nickname} | ❤️ ${post.likes}
        </div>
      `;
      communityList.appendChild(div);
    });
  }

  let currentSort = "latest";
  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sortButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      loadPosts(boardParam, currentSort);
    });
  });

  loadPosts(boardParam, currentSort);
});
