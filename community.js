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
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── 1. Firebase 초기화 ─────────────────────────────────────────────────────────────────────────
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
onAuthStateChanged(auth, user => {
  currentUser = user;
});

// ─── 2. URL 파라미터 가져오기 헬퍼 ────────────────────────────────────────────────────────────────
function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ─── 3. 게시글 작성(글쓰기) 폼 토글 및 처리 ────────────────────────────────────────────────────────
// (1) HTML 요소 참조
const writeForm      = document.getElementById('writeForm');
const showWriteForm  = document.getElementById('showWriteForm');

// (2) “글쓰기” 버튼 클릭 시 폼 보이기/숨기기
showWriteForm?.addEventListener('click', () => {
  writeForm.style.display = writeForm.style.display === 'none' ? 'block' : 'none';
});

// (3) 글쓰기 폼 제출 처리
writeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 입력값
  const title   = document.getElementById('writeTitle').value.trim();
  const summary = document.getElementById('writeBody').value.trim();       // 줄거리(요약)
  const detail  = document.getElementById('postDetailInput').value.trim(); // 본문 내용(상세)
  const board   = document.getElementById('writeBoard').value;             // 게시판 종류(free, notice, archive)

  if (!title || !summary || !detail) {
    alert('제목, 줄거리, 본문을 모두 입력해주세요.');
    return;
  }

  // 닉네임 가져오기 (users 컬렉션에서)
  async function getUserNickname(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data().nickname || '익명') : '익명';
  }

  const nickname = await getUserNickname(currentUser.uid);
  const dateStr  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Firestore에 게시글 추가
  await addDoc(collection(db, 'communityPosts'), {
    title,
    summary,
    detail,
    board,
    date: dateStr,
    likes: 0,
    nickname,
    uid: currentUser.uid
  });

  alert('게시글이 등록되었습니다.');
  // 게시판 종류에 맞춰 페이지 새로고침
  location.href = `community.html?board=${board}`;
});


// ─── 4. 게시글 목록 불러오기 & 렌더링 ────────────────────────────────────────────────────────────
async function loadPosts(board, sort = 'latest') {
  const listContainer = document.getElementById('communityList');
  listContainer.innerHTML = '';

  // board 필터링: communityPosts 컬렉션에서 board == 선택된 값인 문서만 가져오기
  const q = query(collection(db, 'communityPosts'), where('board', '==', board));
  const snapshot = await getDocs(q);

  // 게시글 배열에 담기
  let posts = [];
  snapshot.forEach(docSnap => {
    posts.push({ id: docSnap.id, ...docSnap.data() });
  });

  // 정렬: 최신순 vs 인기순
  posts.sort((a, b) => {
    if (sort === 'popular') {
      return b.likes - a.likes;
    } else {
      return new Date(b.date) - new Date(a.date);
    }
  });

  if (posts.length === 0) {
    listContainer.innerHTML = '<p>게시글이 없습니다.</p>';
    return;
  }

  // 각 게시글 렌더링
  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post-item';
    div.innerHTML = `
      <h3>
        <a href="community.html?id=${post.id}&board=${board}">${post.title}</a>
      </h3>
      <p>${post.summary}</p>
      <div class="meta">
        ${post.date} | ${post.nickname} | ❤️ ${post.likes}
      </div>
    `;
    listContainer.appendChild(div);
  });
}


// ─── 5. 게시판 및 정렬 버튼 초기화 ───────────────────────────────────────────────────────────────
const boardParam    = getParamFromURL('board') || 'free';
const sortButtons   = document.querySelectorAll('.sort-btn');
const boardSelector = document.getElementById('boardSelector');
const boardTitle    = document.getElementById('boardTitle');

// (1) 셀렉트 박스, 제목 초기화
boardSelector.value = boardParam;
boardTitle.textContent = {
  free: '자유게시판',
  notice: '이벤트/공지',
  archive: '자료실'
}[boardParam] || '자유게시판';

// (2) 정렬 버튼 클릭 시 재호출
let currentSort = 'latest';
sortButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    sortButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    loadPosts(boardParam, currentSort);
  });
});

// (3) 처음 로드
loadPosts(boardParam);


// (4) 게시판 종류 변경 시 이동
boardSelector?.addEventListener('change', e => {
  const newBoard = e.target.value;
  location.href = `community.html?board=${newBoard}`;
});


// ─── 6. 개별 게시글 상세 보기 + 좋아요, 댓글 기능 ───────────────────────────────────────────────────
const postId = getParamFromURL('id');
const postDetailContainer = document.getElementById('postDetail');

if (postId && postDetailContainer) {
  // (1) 게시글 데이터 가져오기
  getDoc(doc(db, 'communityPosts', postId)).then(async docSnap => {
    if (!docSnap.exists()) {
      postDetailContainer.innerHTML = '<p>게시글을 찾을 수 없습니다.</p>';
      return;
    }

    const data = docSnap.data();

    // (2) 게시글 본문 + 좋아요 버튼 + 댓글 섹션 HTML 뼈대 삽입
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

    // ─── 좋아요 버튼 로직 ───────────────────────────────────────────────────────────────────────
    const likeButton = document.getElementById('likeButton');
    likeButton?.addEventListener('click', async () => {
      if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
      }
      // Firestore에서 likes 값을 1 증가
      const postRef = doc(db, 'communityPosts', postId);
      await updateDoc(postRef, { likes: data.likes + 1 });
      // 버튼 텍스트를 즉시 업데이트 (새로고침 없이)
      data.likes += 1;
      likeButton.textContent = `❤️ 좋아요 (${data.likes})`;
    });

    // ─── 댓글 로딩 함수 ─────────────────────────────────────────────────────────────────────────
    async function loadComments() {
      const commentListEl = document.getElementById('commentList');
      commentListEl.innerHTML = '';

      // comments 컬렉션에서 postId 필터링한 모든 댓글 불러오기
      const commentsQuery = query(
        collection(db, 'comments'),
        where('postId', '==', postId)
      );
      const commentSnap = await getDocs(commentsQuery);
      let comments = [];
      commentSnap.forEach(cSnap => {
        comments.push({ id: cSnap.id, ...cSnap.data() });
      });
      // 작성일 기준 오름차순 정렬 (필요 시)
      comments.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (comments.length === 0) {
        commentListEl.innerHTML = '<p>댓글이 없습니다.</p>';
        return;
      }

      // 댓글 하나씩 렌더링
      comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.style = 'border-bottom:1px solid #ddd; padding:0.5rem 0;';

        // 기본 댓글 텍스트 부분
        let commentHTML = `
          <p style="margin:0;">
            <strong>${comment.nickname}</strong>
            <span style="color:#888; font-size:0.9rem; margin-left:0.5rem;">
              ${comment.date}
            </span>
          </p>
          <p id="commentText-${comment.id}" style="margin:0.3rem 0;">
            ${comment.text}
          </p>
        `;

        // 작성자 본인일 경우 “수정/삭제” 버튼 추가
        if (currentUser && currentUser.uid === comment.uid) {
          commentHTML += `
            <button class="editCommentBtn" data-id="${comment.id}" style="font-size:0.8rem; margin-right:0.5rem;">
              수정
            </button>
            <button class="deleteCommentBtn" data-id="${comment.id}" style="font-size:0.8rem;">
              삭제
            </button>
          `;
        }

        div.innerHTML = commentHTML;
        commentListEl.appendChild(div);

        // ── 댓글 삭제 로직 ───────────────────────────────────────────────────────────
        if (currentUser && currentUser.uid === comment.uid) {
          const deleteBtn = div.querySelector(`.deleteCommentBtn[data-id="${comment.id}"]`);
          deleteBtn?.addEventListener('click', async () => {
            const ok = confirm('정말 이 댓글을 삭제하시겠습니까?');
            if (!ok) return;
            await deleteDoc(doc(db, 'comments', comment.id));
            loadComments();
          });
        }

        // ── 댓글 수정 로직 ───────────────────────────────────────────────────────────
        if (currentUser && currentUser.uid === comment.uid) {
          const editBtn = div.querySelector(`.editCommentBtn[data-id="${comment.id}"]`);
          editBtn?.addEventListener('click', () => {
            // 원본 텍스트를 input으로 바꿔주기
            const originalTextEl = document.getElementById(`commentText-${comment.id}`);
            const originalText = originalTextEl.textContent;
            const editTextarea = document.createElement('textarea');
            editTextarea.id = `editCommentInput-${comment.id}`;
            editTextarea.style = 'width:100%; height:3rem; margin:0.3rem 0;';
            editTextarea.value = originalText;

            // “저장” 버튼 생성
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '저장';
            saveBtn.style = 'font-size:0.8rem; margin-right:0.5rem;';

            // “취소” 버튼 생성
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '취소';
            cancelBtn.style = 'font-size:0.8rem;';

            // 기존 텍스트, 수정/삭제 버튼을 지우고 textarea + 저장/취소 버튼 노출
            const parentDiv = originalTextEl.parentElement;
            parentDiv.replaceChild(editTextarea, originalTextEl);
            const btnContainer = parentDiv.querySelectorAll('button');
            btnContainer.forEach(b => b.remove());
            parentDiv.appendChild(saveBtn);
            parentDiv.appendChild(cancelBtn);

            // 저장 시 Firestore 업데이트
            saveBtn.addEventListener('click', async () => {
              const newText = editTextarea.value.trim();
              if (!newText) {
                alert('댓글 내용을 입력해주세요.');
                return;
              }
              await updateDoc(doc(db, 'comments', comment.id), { text: newText });
              loadComments();
            });

            // 취소 시 원래대로
            cancelBtn.addEventListener('click', () => {
              loadComments();
            });
          });
        }
      });
    }

    // 최초 댓글 로딩
    loadComments();

    // ─── 댓글 추가 로직 ─────────────────────────────────────────────────────────────────────────
    const addCommentButton = document.getElementById('addCommentButton');
    addCommentButton?.addEventListener('click', async () => {
      if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
      }
      const commentInput = document.getElementById('commentInput');
      const text = commentInput.value.trim();
      if (!text) {
        alert('댓글을 입력해주세요.');
        return;
      }

      // 닉네임 가져옴 (users 컬렉션)
      async function getUserNickname(uid) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? (userDoc.data().nickname || '익명') : '익명';
      }
      const nickname = await getUserNickname(currentUser.uid);
      const dateStr  = new Date().toISOString().slice(0, 10);

      // 새로운 댓글 추가 (comments 컬렉션)
      await addDoc(collection(db, 'comments'), {
        postId,
        uid: currentUser.uid,
        nickname,
        text,
        date: dateStr
      });

      // 입력창 초기화 및 댓글 다시 로딩
      commentInput.value = '';
      loadComments();
    });
  });
}
