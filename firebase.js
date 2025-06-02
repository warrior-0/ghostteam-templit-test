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
      localStorage.removeItem('loggedIn');
      alert("로그아웃 되었습니다.");
      location.reload();
    };
  } else {
    btn.textContent = "로그인";
    btn.onclick = () => {
      localStorage.setItem('prevPage', location.pathname + location.search);
      window.location.href = "login.html";
    };
  }
  authDiv.appendChild(btn);
}
onAuthStateChanged(auth, user => {
  currentUser = user;
  renderAuthUI(user);
});

// 회원가입 함수(닉네임 포함)
async function signUpWithFirebase(email, password, nickname) {
  if (!nickname) throw new Error("닉네임을 입력해주세요.");
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      nickname: nickname,
    });
    alert("회원가입 완료! 로그인되었습니다.");
    // 바로 로그인 처리 후 이전 페이지로 이동
    const prev = localStorage.getItem('prevPage') || 'index.html';
    window.location.href = prev;
  } catch (error) {
    throw error;
  }
}
// 전역 내보내기
window.signUpWithFirebase = signUpWithFirebase;

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
window.signInWithFirebase = signInWithFirebase;

// 로그아웃 함수도 전역으로 노출(메인에서 window.signOutUser로 호출 가능)
window.signOutUser = async function() {
  await signOut(auth);
  localStorage.removeItem('loggedIn');
  alert("로그아웃 되었습니다.");
  location.reload();
};

// 이하 게시판/댓글 등 기존 코드 동일
// ...
