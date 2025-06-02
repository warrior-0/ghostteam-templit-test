// auth.js: Firebase Auth만 사용하는 구조로 변경
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
const auth = getAuth();
export function renderAuthButton() {
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
  btn.textContent = "로그아웃";
  btn.onclick = async () => {
    await signOut(auth);
  };
  authDiv.appendChild(btn);
}
// 로그인 버튼은 firebase.js에서 일괄 처리
