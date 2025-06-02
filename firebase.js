import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// 로그인/로그아웃 버튼 렌더링 (모든 페이지에서 작동)
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
onAuthStateChanged(auth, user => {
  currentUser = user;
  renderAuthUI(user);
});
    // 로그인 상태 감지 및 UI 업데이트
    onAuthStateChanged(auth, (user) => {

      currentUser = user;
      if (user) {
        document.getElementById("userStatus").innerText = `로그인: ${user.email}`;
        document.getElementById("authSection").style.display = "none";
        document.getElementById("postSection").style.display = "block";
        loadPosts();
        loadComments();
        calculateAverageRating();
      } else {
        document.getElementById("userStatus").innerText = "로그인 필요";
        document.getElementById("authSection").style.display = "block";
        document.getElementById("postSection").style.display = "none";
      }
    });

    // 회원가입
    async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const nickname = document.getElementById("nickname").value.trim();

  if (!nickname) {
    alert("닉네임을 입력해주세요.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore에 닉네임 저장
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      nickname: nickname,
    });

    alert("회원가입 완료! 로그인되었습니다.");
  } catch (error) {
    alert("회원가입 오류: " + error.message);
  }
}


// 로그인
async function signInWithFirebase(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem('loggedIn', 'true');
    alert("로그인 성공!");
    // 이전 페이지로 이동
    const prev = localStorage.getItem('prevPage') || 'index.html';
    window.location.href = prev;
  } catch (error) {
    alert("로그인 오류: " + error.message);
    throw error;
  }
}
// 전역에서 사용할 수 있게
window.signInWithFirebase = signInWithFirebase;
// 로그아웃 함수도 전역으로 노출(메인에서 window.signOutUser로 호출 가능)
window.signOutUser = async function() {
  await signOut(auth);
  localStorage.removeItem('loggedIn');
  alert("로그아웃 되었습니다.");
  location.reload();
};



    // 게시글 불러오기
    async function loadPosts() {
      const postsRef = collection(db, "posts");
      const snapshot = await getDocs(postsRef);
      const list = document.getElementById("postList");
      list.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("li");
        item.innerHTML = `
          <a href="post.html?id=${doc.id}"><strong>${data.title}</strong></a>
          - 작성자: ${data.authorname || "익명"}
        `;
        if (currentUser && data.authorUid === currentUser.uid) {
          const editBtn = document.createElement("button");
          const deleteBtn = document.createElement("button");
          editBtn.textContent = "수정";
          deleteBtn.textContent = "삭제";
          editBtn.onclick = () => editPost(doc.id, data);
          deleteBtn.onclick = () => deletePost(doc.id);
          item.appendChild(editBtn);
          item.appendChild(deleteBtn);
        }
        list.appendChild(item);
      });
    }
    // 게시글 수정
    function editPost(postId, data) {
      const newTitle = prompt("새 제목을 입력하세요", data.title);
      const newContent = prompt("새 내용을 입력하세요", data.content);
      if (newTitle !== null && newContent !== null) {
        const postRef = doc(db, "posts", postId);
        setDoc(postRef, {
          ...data,
          title: newTitle,
          content: newContent,
        }).then(() => {
          alert("게시글이 수정되었습니다.");
          loadPosts();
        });
      }
    }

    // 게시글 삭제
    async function deletePost(postId) {
  if (confirm("정말로 이 게시글을 삭제하시겠습니까?")) {
    await deleteDoc(doc(db, "posts", postId));
    alert("게시글이 삭제되었습니다.");
    loadPosts();
  }
}

    // 게시글 작성
async function createPost() {
  if (!currentUser) {
    alert("로그인 후 작성 가능합니다.");
    return;
  }

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  // 유저 정보 불러오기 (닉네임)
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";

  await addDoc(collection(db, "posts"), {
    title,
    content,
    authorUid: currentUser.uid,
    authorEmail: currentUser.email,
    authorname: nickname, // 여기 이름을 일관성 있게 사용
    created: new Date(),
  });

  alert("작성 완료!");
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
  loadPosts();
}





    // 댓글 불러오기
    async function loadComments() {
      const commentsRef = collection(db, "comments");
      const q = query(commentsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const list = document.getElementById("commentList");
      list.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `<strong>${data.authorname||"익명"}</strong>: ${data.comment}`;
        if (currentUser && data.uid === currentUser.uid) {
          const editBtn = document.createElement("button");
          const deleteBtn = document.createElement("button");
          //수정 버튼
          editBtn.textContent = "수정";
          editBtn.onclick = () => editComment(doc.id, data);
          li.appendChild(editBtn);
          //삭제 버튼
          deleteBtn.textContent = "삭제";
          deleteBtn.onclick = () => deleteComment(doc.id);
          li.appendChild(deleteBtn);
        }
        list.appendChild(li);
      });
    }

    // 댓글 작성
    async function submitComment(event) {
  event.preventDefault();
  if (!currentUser) {
    alert("로그인 후 댓글 작성 가능합니다.");
    return;
  }

  const comment = document.getElementById("comment").value.trim();
  if (!comment) {
    alert("댓글을 입력해주세요.");
    return;
  }

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";

  await addDoc(collection(db, "comments"), {
    comment,
    authorname: nickname,
    uid: currentUser.uid,
    timestamp: new Date(),
  });

  alert("댓글 등록 완료!");
  document.getElementById("commentForm").reset();
  loadComments();
}

    // 댓글 수정
    function editComment(commentId, data) {
      const newComment = prompt("댓글을 수정하세요", data.comment);
      if (newComment !== null) {
        const commentRef = doc(db, "comments", commentId);
        setDoc(commentRef, {
          ...data,
          comment: newComment,
        }).then(() => {
          alert("댓글이 수정되었습니다.");
          loadComments();
        });
      }
    }
// 댓글 삭제
async function deleteComment(commentId) {
  if (confirm("정말로 이 댓글을 삭제하시겠습니까?")) {
    await deleteDoc(doc(db, "comments", commentId));
    alert("댓글이 삭제되었습니다.");
    loadComments();
  }
}
    // 평점 제출
async function submitRating() {
  if (!currentUser) {
    alert("로그인 후 평점 제출 가능합니다.");
    return;
  }

  const ratingValue = selectedRating;
  if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    alert("1 이상 5 이하의 평점을 입력해주세요.");
    return;
  }

  const ratingsRef = collection(db, "ratings");
  const q = query(ratingsRef, where("uid", "==", currentUser.uid));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // 이미 등록한 평점이 있을 경우 → 수정
    const ratingDoc = snapshot.docs[0];
    const ratingRef = doc(db, "ratings", ratingDoc.id);
    await setDoc(ratingRef, {
      ...ratingDoc.data(),
      rating: ratingValue,
      timestamp: new Date(),
    });
    alert("평점이 수정되었습니다!");
  } else {
    // 처음 평점 등록
    await addDoc(ratingsRef, {
      rating: ratingValue,
      uid: currentUser.uid,
      timestamp: new Date(),
    });
    alert("평점이 저장되었습니다!");
  }

  document.getElementById("rating").value = "";
  await calculateAverageRating();
}
// 평균 평점 계산
    async function calculateAverageRating() {
      const ratingsRef = collection(db, "ratings");
      const snapshot = await getDocs(ratingsRef);
      let sum = 0;
      let count = 0;
      snapshot.forEach((doc) => {
        sum += doc.data().rating;
        count++;
      });
      const avg = count === 0 ? 0 : (sum / count).toFixed(1);
      document.getElementById("avgRating").innerText = `현재 평균 평점: ${avg}점`;
    }
let selectedRating = 0;
    window.onload = () => {
      const stars = document.querySelectorAll("#starRating .star");
      stars.forEach(star => {
        star.addEventListener("click", () => {
        selectedRating = parseInt(star.getAttribute("data-value"));
        stars.forEach(s => s.classList.remove("selected"));
        for (let i = 0; i < selectedRating; i++) {
          stars[i].classList.add("selected");
    }
  });
});
      document.getElementById("signUpBtn").onclick = signUp;
      document.getElementById("signInBtn").onclick = signIn;
      document.getElementById("signOutBtn").onclick = signOutUser;

      document.getElementById("postCreateBtn").onclick = createPost;
      document.getElementById("commentForm").addEventListener("submit", submitComment);
      document.getElementById("ratingSubmit").onclick = submitRating;
    };
