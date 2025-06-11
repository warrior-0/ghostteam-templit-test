
// ✅ urban.js fully synced: Firestore + dummyData.likes + 화면 갱신 반영

import {{
  initializeApp
}} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {{
  getFirestore, doc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, setDoc
}} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {{
  getAuth,
  onAuthStateChanged
}} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {{
  apiKey: "AIzaSyAjHwHbHlCi4vgv-Ma0-3kqt-M3SLI_oF4",
  authDomain: "ghost-38f07.firebaseapp.com",
  projectId: "ghost-38f07",
  storageBucket: "ghost-38f07.appspot.com",
  messagingSenderId: "776945022976",
  appId: "1:776945022976:web:105e545d39f12b5d0940e5",
  measurementId: "G-B758ZC971V"
}};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
onAuthStateChanged(auth, user => {{
  currentUser = user;
}});

function setupLikeButton(postId) {{
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');

  if (!likeBtn || !likeCount) return;

  const postRef = doc(db, 'urbanLikes', String(postId));

  getDoc(postRef).then(docSnap => {{
    const data = docSnap.exists() ? docSnap.data() : {{ count: 0, users: [] }};
    likeCount.textContent = data.count || 0;

    likeBtn.addEventListener('click', async () => {{
      if (!currentUser) {{
        alert('로그인이 필요합니다');
        return;
      }}
      const uid = currentUser.uid;
      const alreadyLiked = data.users?.includes(uid);
      if (alreadyLiked) {{
        alert('이미 좋아요를 누르셨습니다');
        return;
      }}

      // Firebase 저장
      data.count += 1;
      data.users.push(uid);
      await setDoc(postRef, data);

      // ✅ 더미 데이터 likes 동기화
      const story = urbanData.find(item => item.id === postId);
      if (story) {{
        story.likes = (story.likes || 0) + 1;
        likeCount.textContent = story.likes; // ✅ 즉시 반영
      }}
    }});
  }});
}}

export const urbanData = [
  {{
    id: 1,
    title: '층간소음',
    likes: 0,
    date: '2025-05-20',
    filter: 'korea',
    level: 4,
    thumb: '/image/urban1.webp',
    body: '...',
    detail: '...'
  }},
  {{
    id: 2,
    title: '하나코야 놀자',
    likes: 0,
    date: '2025-05-18',
    filter: 'foreign',
    level: 4,
    thumb: '/image/urban2.webp',
    body: '...',
    detail: '...'
  }}
  // ... 더미 데이터 생략 ...
];

// 나머지 renderUrbanList, renderUrbanDetail 등은 유지

