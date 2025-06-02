window.firebaseConfig = firebaseConfig; // community.js에서 사용
// Firestore 인스턴스와 로그인 유저를 window.firebaseApp에 등록
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
window.firebaseApp = { firestore: db, currentUser: null };
onAuthStateChanged(auth, user => {
  window.firebaseApp.currentUser = user;
  renderAuthUI(user);
});
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

// 로그인/회원가입
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
    const prev = localStorage.getItem('prevPage') || 'index.html';
    window.location.href = prev;
  } catch (error) {
    throw error;
  }
}
window.signUpWithFirebase = signUpWithFirebase;

async function signInWithFirebase(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem('loggedIn', 'true');
    alert("로그인 성공!");
    const prev = localStorage.getItem('prevPage') || 'index.html';
    window.location.href = prev;
  } catch (error) {
    alert("로그인 오류: " + error.message);
    throw error;
  }
}
window.signInWithFirebase = signInWithFirebase;

window.signOutUser = async function() {
  await signOut(auth);
  localStorage.removeItem('loggedIn');
  alert("로그아웃 되었습니다.");
  location.reload();
};

// 게시판 글 목록 및 상세
window.loadPosts = async function () {
  const postsRef = collection(db, "posts");
  const snapshot = await getDocs(query(postsRef, orderBy("created", "desc")));
  const list = document.getElementById("postList");
  list.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const item = document.createElement("li");
    item.innerHTML = `<a href="#" data-id="${docSnap.id}">${data.title}</a>`;
    list.appendChild(item);
  });

  // 제목 클릭시 내용 표시
  list.querySelectorAll('a[data-id]').forEach(a => {
    a.onclick = async function(e) {
      e.preventDefault();
      const postId = this.dataset.id;
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data();
        list.innerHTML = `
          <h3>${data.title}</h3>
          <div>${data.content}</div>
          <div id="postLikes"></div>
          <div id="postComments"></div>
          <form id="postCommentForm"><input id="postCommentInput" placeholder="댓글"/><button>댓글달기</button></form>
          <button onclick="window.loadPosts()">목록으로</button>
        `;
        window.renderPostLikes(postId);
        window.renderPostComments(postId);
        document.getElementById('postCommentForm').onsubmit = async function(ev) {
          ev.preventDefault();
          if (!currentUser) { alert('로그인 후 댓글 작성 가능'); return; }
          const comment = document.getElementById('postCommentInput').value.trim();
          if (comment) {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
            await addDoc(collection(db, "post_comments"), {
              postId, uid: currentUser.uid, comment, nickname, timestamp: serverTimestamp()
            });
            window.renderPostComments(postId);
            document.getElementById('postCommentInput').value = '';
          }
        };
      }
    };
  });
};

// 글쓰기
window.writePost = async function () {
  if (!currentUser) { alert('로그인 후 글 작성 가능'); return; }
  const title = prompt('제목을 입력하세요');
  const content = prompt('내용을 입력하세요');
  if (!title || !content) return;
  await addDoc(collection(db, "posts"), {
    title, content, authorUid: currentUser.uid, created: new Date()
  });
  alert('작성 완료!');
  window.loadPosts();
};

// 게시글 좋아요
window.renderPostLikes = async function (postId) {
  const likesRef = collection(db, "post_likes");
  const q = query(likesRef, where("postId", "==", postId));
  const snapshot = await getDocs(q);
  const likeDiv = document.getElementById('postLikes');
  const count = snapshot.size;
  let liked = false;
  if (currentUser) {
    snapshot.forEach(docSnap => {
      if (docSnap.data().uid === currentUser.uid) liked = true;
    });
  }
  likeDiv.innerHTML = `
    좋아요 ${count}개 
    <button id="likePostBtn">${liked ? '취소' : '좋아요'}</button>
  `;
  document.getElementById('likePostBtn').onclick = async function() {
    if (!currentUser) { alert('로그인 후 좋아요 가능'); return; }
    if (liked) {
      // unlike: 해당 like document 삭제
      const snap = await getDocs(query(likesRef, where("postId", "==", postId), where("uid", "==", currentUser.uid)));
      snap.forEach(d => deleteDoc(doc(db, "post_likes", d.id)));
    } else {
      await addDoc(likesRef, { postId, uid: currentUser.uid });
    }
    window.renderPostLikes(postId);
  };
};

// 게시글 댓글
window.renderPostComments = async function(postId) {
  const commentsRef = collection(db, "post_comments");
  const q = query(commentsRef, where("postId", "==", postId), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  const commentDiv = document.getElementById('postComments');
  commentDiv.innerHTML = `<ul>${[...snapshot].map(s => `<li><b>${s.data().nickname}</b>: ${s.data().comment}</li>`).join('')}</ul>`;
};

// urban(괴담) 좋아요
window.renderUrbanLikes = async function (urbanId) {
  const likesRef = collection(db, "urban_likes");
  const q = query(likesRef, where("urbanId", "==", urbanId));
  const snapshot = await getDocs(q);
  const likeDiv = document.getElementById('urbanLikes');
  const count = snapshot.size;
  let liked = false;
  if (currentUser) {
    snapshot.forEach(docSnap => {
      if (docSnap.data().uid === currentUser.uid) liked = true;
    });
  }
  likeDiv.innerHTML = `
    좋아요 ${count}개 
    <button id="likeUrbanBtn">${liked ? '취소' : '좋아요'}</button>
  `;
  document.getElementById('likeUrbanBtn').onclick = async function() {
    if (!currentUser) { alert('로그인 후 좋아요 가능'); return; }
    if (liked) {
      const snap = await getDocs(query(likesRef, where("urbanId", "==", urbanId), where("uid", "==", currentUser.uid)));
      snap.forEach(d => deleteDoc(doc(db, "urban_likes", d.id)));
    } else {
      await addDoc(likesRef, { urbanId, uid: currentUser.uid });
    }
    window.renderUrbanLikes(urbanId);
  };
};


// urban(괴담) 댓글
window.renderUrbanComments = async function(urbanId) {
  const commentsRef = collection(db, "urban_comments");
  const q = query(commentsRef, where("urbanId", "==", urbanId), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  const commentDiv = document.getElementById('urbanComments');
  commentDiv.innerHTML = `<ul>${[...snapshot].map(s => `<li><b>${s.data().nickname}</b>: ${s.data().comment}</li>`).join('')}</ul>`;
};

window.writeUrbanComment = async function(e, urbanId) {
  e.preventDefault();
  if (!currentUser) { alert('로그인 후 댓글 작성 가능'); return; }
  const comment = document.getElementById('urbanCommentInput').value.trim();
  if (!comment) return;
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const nickname = userDoc.exists() ? userDoc.data().nickname : "익명";
  await addDoc(collection(db, "urban_comments"), {
    urbanId, uid: currentUser.uid, comment, nickname, timestamp: serverTimestamp()
  });
  window.renderUrbanComments(urbanId);
  document.getElementById('urbanCommentInput').value = '';
};

// 댓글 불러오기
async function loadComments(postId) {
  const commentsRef = collection(db, "comments");
  const q = query(commentsRef, where("postId", "==", String(postId)), orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);
  const list = document.getElementById("commentList");
  list.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.innerHTML = `<strong>${data.authorname||"익명"}</strong>: ${data.comment}`;
    // ... 수정/삭제 버튼 등 ...
    list.appendChild(li);
  });
}
window.loadComments = loadComments;

// 댓글 작성
async function submitComment(event, postId) {
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
    postId: String(postId),
    comment,
    authorname: nickname,
    uid: currentUser.uid,
    timestamp: new Date()
  });
  document.getElementById("comment").value = "";
  loadComments(postId);
}
window.submitComment = submitComment;
