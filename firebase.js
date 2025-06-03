// firebase.js - 인증, Firestore, 로그인 UI 일원화(모든 페이지에서 import됨)
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
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
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

// 로그인/로그아웃 버튼 항상 보이게!
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
      // UI 즉시 갱신
      renderAuthUI(null);
      localStorage.removeItem('loggedIn');
      location.reload();
    };
  } else {
    btn.textContent = "로그인";
    btn.onclick = () => window.location.href = "login.html";
  }
  authDiv.appendChild(btn);
}

// 1. 페이지 진입시 항상 "로그인" 노출
document.addEventListener("DOMContentLoaded", () => {
  renderAuthUI(null);
});

// 2. 인증 상태 변화시 즉시 반영
onAuthStateChanged(auth, user => {
  currentUser = user;
  window.isLoggedIn = !!user;
  renderAuthUI(user);
});

// 회원가입 함수(닉네임 포함)
async function signUpWithFirebase(email, password, nickname) {
  if (!nickname) throw new Error("닉네임을 입력해주세요.");
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    nickname: nickname,
  });
  // 로그인 처리 후 홈으로 이동
  window.location.href = "index.html";
}
window.signUpWithFirebase = signUpWithFirebase;

// 로그인 함수
async function signInWithFirebase(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  localStorage.setItem('loggedIn', 'true');
  // 이전 페이지로 이동
  const prev = localStorage.getItem('prevPage') || 'index.html';
  window.location.href = prev;
}
window.signInWithFirebase = signInWithFirebase;

// 로그아웃 함수
window.signOutUser = async function() {
  await signOut(auth);
  localStorage.removeItem('loggedIn');
  renderAuthUI(null);
  location.reload();
};

// ============= 게시글 CRUD ============= //

// 글쓰기
async function createPost({ title, content, authorUid, authorNickname }) {
  const docRef = await addDoc(collection(db, "posts"), {
    title,
    content,
    authorUid,
    authorNickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    likes: [],
    likeCount: 0
  });
  return docRef.id;
}
window.createPost = createPost;

// 글 수정
async function updatePost(postId, { title, content }) {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    title,
    content,
    updatedAt: serverTimestamp()
  });
}
window.updatePost = updatePost;

// 글 삭제
async function deletePost(postId) {
  const postRef = doc(db, "posts", postId);
  // 댓글도 같이 삭제하기
  const commentsSnap = await getDocs(query(collection(db, "comments"), where("postId", "==", postId)));
  const batchDeletes = [];
  commentsSnap.forEach(commentDoc => {
    batchDeletes.push(deleteDoc(doc(db, "comments", commentDoc.id)));
  });
  await Promise.all(batchDeletes);
  await deleteDoc(postRef);
}
window.deletePost = deletePost;

// ============= 댓글 CRUD ============= //

// 댓글 작성
async function createComment({ postId, content, authorUid, authorNickname }) {
  const docRef = await addDoc(collection(db, "comments"), {
    postId,
    content,
    authorUid,
    authorNickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}
window.createComment = createComment;

// 댓글 수정
async function updateComment(commentId, { content }) {
  const commentRef = doc(db, "comments", commentId);
  await updateDoc(commentRef, {
    content,
    updatedAt: serverTimestamp()
  });
}
window.updateComment = updateComment;

// 댓글 삭제
async function deleteComment(commentId) {
  const commentRef = doc(db, "comments", commentId);
  await deleteDoc(commentRef);
}
window.deleteComment = deleteComment;

// ============= 좋아요 ============= //

// 글 좋아요 토글
async function toggleLike(postId, userUid) {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error("게시글이 존재하지 않습니다.");
  const post = postSnap.data();
  const alreadyLiked = post.likes?.includes(userUid);
  if (alreadyLiked) {
    await updateDoc(postRef, {
      likes: arrayRemove(userUid),
      likeCount: increment(-1)
    });
  } else {
    await updateDoc(postRef, {
      likes: arrayUnion(userUid),
      likeCount: increment(1)
    });
  }
}
window.toggleLike = toggleLike;

// ============= export Firestore, Auth, currentUser getter ============= //
export { db, auth, currentUser };
