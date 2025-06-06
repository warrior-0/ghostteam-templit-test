// community.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ====== Firebase 설정 ======
const firebaseConfig = {
  apiKey: "AIzaSyAjHwHbHlCi4vgv-Ma0-3kqt-M3SLI_oF4",
  authDomain: "ghost-38f07.firebaseapp.com",
  projectId: "ghost-38f07",
  storageBucket: "ghost-38f07.appspot.com",
  messagingSenderId: "776945022976",
  appId: "1:776945022976:web:105e545d39f12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수: 현재 로그인된 사용자 정보 저장용
let currentUser = null;

// DOM 요소
const postForm = document.getElementById("postForm");
const postTitleInput = document.getElementById("postTitle");
const postBodyInput = document.getElementById("postBody");
const loginPrompt = document.getElementById("loginPrompt");
const postsContainer = document.getElementById("postsContainer");

// 1) 사용자 인증 상태를 감시 -> 로그인/로그아웃 시 UI 변경 및 포스트 불러오기
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    postForm.style.display = "block";
    loginPrompt.style.display = "none";
  } else {
    currentUser = null;
    postForm.style.display = "none";
    loginPrompt.style.display = "block";
  }
  // 인증 상태가 변할 때마다 최신 글 목록을 다시 불러옵니다.
  loadPosts();
});

// 2) 새 글 작성 이벤트
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert("로그인 후 글을 작성할 수 있습니다.");
    return;
  }

  const title = postTitleInput.value.trim();
  const body = postBodyInput.value.trim();
  if (title === "" || body === "") {
    alert("제목과 내용을 모두 입력하세요.");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      title,
      body,
      uid: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email || "익명",
      createdAt: serverTimestamp()
    });
    postForm.reset();
    loadPosts();
  } catch (error) {
    console.error("새 글 작성 오류:", error);
    alert("글 작성 중 오류가 발생했습니다.");
  }
});

// 3) Firestore에서 모든 게시글을 가져와 렌더링
async function loadPosts() {
  postsContainer.innerHTML = ""; // 초기화

  try {
    // createdAt 기준 내림차순 정렬
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(postsQuery);

    querySnapshot.forEach((docSnap) => {
      const postData = docSnap.data();
      const postId = docSnap.id;
      renderPost(postId, postData);
    });

    if (querySnapshot.empty) {
      postsContainer.innerHTML = "<p>아직 등록된 게시글이 없습니다.</p>";
    }
  } catch (error) {
    console.error("게시글 불러오기 오류:", error);
    postsContainer.innerHTML = "<p>게시글을 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 4) 개별 게시글을 화면에 표시 + 수정/삭제 버튼 추가
function renderPost(postId, postData) {
  const postEl = document.createElement("div");
  postEl.classList.add("post");
  postEl.setAttribute("data-id", postId);

  // 작성자와 날짜 표시
  const infoEl = document.createElement("div");
  infoEl.classList.add("post-info");
  const date = postData.createdAt
    ? postData.createdAt.toDate().toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "날짜 없음";
  infoEl.innerHTML = `<span class="author">${postData.authorName}</span> · <span class="date">${date}</span>`;

  // 제목
  const titleEl = document.createElement("h3");
  titleEl.classList.add("post-title");
  titleEl.textContent = postData.title;

  // 본문
  const bodyEl = document.createElement("p");
  bodyEl.classList.add("post-body");
  bodyEl.textContent = postData.body;

  // 수정/삭제 버튼 컨테이너
  const actionEl = document.createElement("div");
  actionEl.classList.add("post-actions");

  // 현재 로그인된 유저가 글 작성자일 때만 버튼 추가
  if (currentUser && postData.uid === currentUser.uid) {
    // 수정 버튼
    const editBtn = document.createElement("button");
    editBtn.textContent = "수정";
    editBtn.classList.add("edit-btn");
    editBtn.addEventListener("click", () => {
      enableEditing(postId, postData, postEl);
    });

    // 삭제 버튼
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "삭제";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.addEventListener("click", () => {
      deletePost(postId);
    });

    actionEl.append(editBtn, deleteBtn);
  }

  // DOM 조립
  postEl.append(infoEl, titleEl, bodyEl, actionEl);
  postsContainer.appendChild(postEl);
}

// 5) 글 삭제 함수
async function deletePost(postId) {
  const confirmDelete = confirm("정말 이 글을 삭제하시겠습니까?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "posts", postId));
    loadPosts();
  } catch (error) {
    console.error("삭제 오류:", error);
    alert("게시글 삭제 중 오류가 발생했습니다.");
  }
}

// 6) 글 수정 활성화 함수
function enableEditing(postId, postData, postEl) {
  // 기존 제목, 본문 요소 가져오기
  const titleEl = postEl.querySelector(".post-title");
  const bodyEl = postEl.querySelector(".post-body");
  const actionEl = postEl.querySelector(".post-actions");

  // 원본 값 저장
  const originalTitle = postData.title;
  const originalBody = postData.body;

  // 6-1) 입력 폼 생성
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = originalTitle;
  titleInput.classList.add("edit-title-input");

  const bodyTextarea = document.createElement("textarea");
  bodyTextarea.rows = 5;
  bodyTextarea.classList.add("edit-body-textarea");
  bodyTextarea.value = originalBody;

  // 6-2) 저장/취소 버튼 생성
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  saveBtn.classList.add("save-btn");

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "취소";
  cancelBtn.classList.add("cancel-btn");

  // 6-3) 클릭 시 동작 정의
  saveBtn.addEventListener("click", async () => {
    const newTitle = titleInput.value.trim();
    const newBody = bodyTextarea.value.trim();
    if (newTitle === "" || newBody === "") {
      alert("제목과 내용을 모두 입력하세요.");
      return;
    }

    try {
      await updateDoc(doc(db, "posts", postId), {
        title: newTitle,
        body: newBody
      });
      loadPosts();
    } catch (error) {
      console.error("수정 저장 오류:", error);
      alert("게시글 수정 중 오류가 발생했습니다.");
    }
  });

  cancelBtn.addEventListener("click", () => {
    // 수정 취소 시 원래 상태로 복구
    titleEl.textContent = originalTitle;
    bodyEl.textContent = originalBody;
    actionEl.innerHTML = "";
    // 수정/삭제 버튼 다시 렌더링
    const editBtn = document.createElement("button");
    editBtn.textContent = "수정";
    editBtn.classList.add("edit-btn");
    editBtn.addEventListener("click", () => {
      enableEditing(postId, postData, postEl);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "삭제";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.addEventListener("click", () => {
      deletePost(postId);
    });

    actionEl.append(editBtn, deleteBtn);
  });

  // 6-4) DOM 교체: 텍스트 요소 → 입력 폼
  postEl.replaceChild(titleInput, titleEl);
  postEl.replaceChild(bodyTextarea, bodyEl);
  actionEl.innerHTML = "";
  actionEl.append(saveBtn, cancelBtn);
}
