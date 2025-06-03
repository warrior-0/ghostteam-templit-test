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

// export Firestore, Auth, currentUser getter
export { db, auth, currentUser };
