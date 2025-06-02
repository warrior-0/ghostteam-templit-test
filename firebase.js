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

// 기존 firebase.js 기능은 아래와 같이 유지 (게시글, 댓글 등 필요시 추가 사용)
