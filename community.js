// Firestore 기반 커뮤니티 목록/상세/댓글/좋아요 전체 구현

// 게시판 타입별 한글명 매핑
const boardTitles = {
  free: '자유게시판',
  notice: '이벤트/공지',
  archive: '자료실'
};

function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function updateCommunityTitle(boardTypeOrTitle) {
  const titleElem = document.querySelector('.community-title');
  if (titleElem) {
    titleElem.textContent = boardTitles[boardTypeOrTitle] || boardTypeOrTitle || '자유게시판';
  }
}

// Firestore 사용 준비
let db, currentUser;
function waitForFirebase(cb) {
  if (window.firebaseApp && window.firebaseApp.firestore && window.firebaseApp.currentUser !== undefined) {
    db = window.firebaseApp.firestore;
    currentUser = window.firebaseApp.currentUser;
    cb();
  } else {
    setTimeout(() => waitForFirebase(cb), 100);
  }
}

// 게시글 목록 렌더링 (정렬, 게시판별)
async function renderCommunityList(sortType, boardType) {
  waitForFirebase(async () => {
    const communityList = document.getElementById('communityList');
    const commentSection = document.getElementById('commentSection');
    if (commentSection) commentSection.style.display = "none";
    // Firestore에서 불러오기
    const postsRef = db.collection("posts");
    let q = postsRef;
    if (boardType && boardType !== 'all') {
      q = q.where("board", "==", boardType);
    }
    if (sortType === 'popular') {
      q = q.orderBy("likeCount", "desc").orderBy("created", "desc");
    } else {
      q = q.orderBy("created", "desc");
    }
    const snapshot = await q.get();
    if (snapshot.empty) {
      communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">등록된 게시글이 없습니다.</div>`;
    } else {
      communityList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        communityList.innerHTML += `
          <div class="community-item" data-id="${doc.id}" style="cursor:pointer;">
            <div class="community-item-title">${data.title}</div>
            <div class="community-item-meta">
              <span>좋아요 <span class="like-count">${data.likeCount||0}</span>개</span>
              <span>${data.created?.toDate().toISOString().slice(0,10) || ""}</span>
              <span>${boardTitles[data.board]}</span>
            </div>
            <div class="community-item-body">${data.body || ""}</div>
          </div>
        `;
      });
      // 클릭 이벤트 등록(상세보기)
      document.querySelectorAll('.community-item').forEach(itemElem => {
        itemElem.addEventListener('click', function(){
          const clickId = this.getAttribute('data-id');
          window.history.pushState({}, '', `?id=${clickId}`);
          renderCommunityDetail(clickId);
        });
      });
    }
  });
}

// 게시글 상세보기
async function renderCommunityDetail(id) {
  waitForFirebase(async () => {
    const communityList = document.getElementById('communityList');
    const commentSection = document.getElementById('commentSection');
    if (commentSection) commentSection.style.display = "block";
    // Firestore에서 게시글 가져오기
    const docRef = db.collection("posts").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      communityList.innerHTML = `<div style="color:#bbb; padding:2rem 0;">게시글을 찾을 수 없습니다.</div>`;
      updateCommunityTitle('자유게시판');
      if (commentSection) commentSection.style.display = "none";
      return;
    }
    const data = docSnap.data();
    // 제목을 상세 제목으로 변경
    updateCommunityTitle(data.title);

    // 좋아요 여부 체크
    let isLiked = false;
    if (currentUser) {
      const likeDoc = await db.collection("likes").doc(`${id}_${currentUser.uid}`).get();
      isLiked = !!likeDoc.exists;
    }
    communityList.innerHTML = `
      <div class="community-item community-detail">
        <div class="community-item-title" style="font-size:1.5rem;">${data.title}</div>
        <div class="community-item-meta">
          <span>좋아요 <span class="like-count">${data.likeCount||0}</span>개</span>
          <span>${data.created?.toDate().toISOString().slice(0,10) || ""}</span>
          <span>${boardTitles[data.board]}</span>
        </div>
        <div class="community-item-body" style="margin-top:1.5rem; font-size:1.1rem; line-height:1.7;">${data.detail || data.body}</div>
        <button id="likeBtn" style="margin-top:1rem;background:${isLiked?"#e01c1c":"#222"};color:#fafafa;border:none;padding:0.6rem 1.3rem;border-radius:8px;cursor:pointer;">${isLiked?"♥":"♡"} 좋아요</button>
        <button class="community-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">목록으로</button>
      </div>
    `;
    document.querySelector('.community-back-btn').addEventListener('click', function(){
      window.history.back();
    });

    // 좋아요 버튼 이벤트
    document.getElementById('likeBtn').onclick = async function(){
      if (!currentUser) {
        alert("로그인 후 이용 가능합니다.");
        return;
      }
      const likeRef = db.collection("likes").doc(`${id}_${currentUser.uid}`);
      const postRef = db.collection("posts").doc(id);
      const likeDoc = await likeRef.get();
      let likeCount = data.likeCount || 0;
      if (likeDoc.exists) {
        // 좋아요 취소
        await likeRef.delete();
        likeCount = Math.max(0, likeCount-1);
        await postRef.update({ likeCount });
        this.style.background = "#222";
        this.innerText = "♡ 좋아요";
      } else {
        // 좋아요 등록
        await likeRef.set({ postId: id, uid: currentUser.uid, timestamp: new Date() });
        likeCount += 1;
        await postRef.update({ likeCount });
        this.style.background = "#e01c1c";
        this.innerText = "♥ 좋아요";
      }
      document.querySelector('.like-count').innerText = likeCount;
    };

    // 댓글 표시
    loadComments(id);

    // 댓글 작성 이벤트
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
      commentForm.onsubmit = async function(e){
        e.preventDefault();
        await submitComment(id);
      };
    }
  });
}

// 댓글 불러오기
async function loadComments(postId) {
  waitForFirebase(async () => {
    const commentList = document.getElementById("commentList");
    commentList.innerHTML = "";
    const q = db.collection("comments")
      .where("postId", "==", postId)
      .orderBy("timestamp", "asc");
    const snapshot = await q.get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.style.marginBottom = "0.7rem";
      li.innerHTML = `<strong>${data.authorname||"익명"}</strong>: ${data.comment}`;
      // 본인 댓글 수정/삭제
      if (currentUser && data.uid === currentUser.uid) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "삭제";
        deleteBtn.style.marginLeft = "0.8rem";
        deleteBtn.onclick = async () => {
          if (confirm("댓글을 삭제하시겠습니까?")) {
            await db.collection("comments").doc(doc.id).delete();
            loadComments(postId);
          }
        };
        li.appendChild(deleteBtn);
      }
      commentList.appendChild(li);
    });
  });
}

// 댓글 작성
async function submitComment(postId) {
  waitForFirebase(async () => {
    if (!currentUser) {
      alert("로그인 후 댓글 작성 가능합니다.");
      return;
    }
    const commentInput = document.getElementById("comment");
    const comment = commentInput.value.trim();
    if (!comment) {
      alert("댓글을 입력해주세요.");
      return;
    }
    // 닉네임
    let nickname = "익명";
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (userDoc.exists) {
      nickname = userDoc.data().nickname || "익명";
    }
    await db.collection("comments").add({
      postId: postId,
      comment,
      authorname: nickname,
      uid: currentUser.uid,
      timestamp: new Date()
    });
    commentInput.value = "";
    loadComments(postId);
  });
}

// 페이지 진입시 목록/정렬
document.addEventListener('DOMContentLoaded', () => {
  // firebase.js에서 window.firebaseApp에 db, currentUser 등록 필요
  window.firebaseApp = { firestore: null, currentUser: null };
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js').then(async (firebase) => {
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const app = firebase.getApp ? firebase.getApp() : firebase.initializeApp(window.firebaseConfig);
    window.firebaseApp.firestore = getFirestore(app);
    const auth = getAuth(app);
    onAuthStateChanged(auth, user => {
      window.firebaseApp.currentUser = user;
    });
  });

  if (document.getElementById('communityList')) {
    let sortType = 'latest';
    let boardType = getParamFromURL('board') || 'free';
    const idParam = getParamFromURL('id');
    if (idParam) {
      renderCommunityDetail(idParam);
    } else {
      renderCommunityList(sortType, boardType);
      updateCommunityTitle(boardType);
    }

    // 정렬 버튼
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function(){
        document.querySelectorAll('.sort-btn').forEach(b=>b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      });
    });

    // 세부 메뉴 클릭시 (드롭다운 메뉴)
    const communityMenu = document.getElementById('communityMenu');
    if (communityMenu) {
      communityMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function(e){
          e.preventDefault();
          const url = new URL(this.href);
          const newBoard = url.searchParams.get('board') || 'free';
          boardType = newBoard;
          window.history.pushState({}, '', url.pathname + url.search);
          renderCommunityList(sortType, boardType);
          updateCommunityTitle(boardType);
        });
      });
    }

    // 뒤로가기/앞으로가기 지원
    window.addEventListener('popstate', function() {
      const idParam = getParamFromURL('id');
      boardType = getParamFromURL('board') || 'free';
      if (idParam) {
        renderCommunityDetail(idParam);
      } else {
        renderCommunityList(sortType, boardType);
        updateCommunityTitle(boardType);
      }
    });
  }
});
