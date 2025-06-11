
// ✅ urban.js: 괴담 목록, 상세보기, 좋아요 및 댓글 기능 포함 + Firebase 유저 닉네임 반영 (댓글 예외처리 추가) + 오디오 기능

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getFirestore, doc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

function getParamFromURL(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function updateUrbanTitle(filterTypeOrTitle) {
  const titleElem = document.querySelector('.urban-title');
  if (titleElem) {
    titleElem.textContent = filterTitles[filterTypeOrTitle] || filterTypeOrTitle || '괴담 모음';
  }
}

function renderLevelStars(level) {
  return '★'.repeat(level) + '☆'.repeat(5 - level);
}

function setupLikeButton(postId) {
  const likeBtn = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');

  if (!likeBtn || !likeCount) return;

  const postRef = doc(db, 'urbanLikes', String(postId));

  getDoc(postRef).then(docSnap => {
    const data = docSnap.exists() ? docSnap.data() : { count: 0, users: [] };
    // ① 첫 로드시 Firestore 카운트를 dummyData로 초기화
    const story = urbanData.find(item => item.id === postId);
    if (story) {
      story.likes = data.count || 0;
      likeCount.textContent = story.likes;
    }

    likeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('로그인이 필요합니다');
        return;
      }
      const uid = currentUser.uid;
      const alreadyLiked = data.users?.includes(uid);

      if (alreadyLiked) {
        alert('이미 좋아요를 누르셨습니다');
        return;
      }

      // ② 클릭 시 dummyData.likes 먼저 증가시키고 Firestore에도 동기화
      story.likes++;
      data.count = story.likes;
      data.users.push(uid);
      await setDoc(postRef, data);
      likeCount.textContent = story.likes;
    });
  });
}

async function getUserNickname(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.nickname || '익명';
    }
  } catch (err) {
    console.warn('닉네임 조회 실패:', err);
  }
  return '익명';
}

async function loadComments(postId) {
  const commentList = document.getElementById('commentList');
  commentList.innerHTML = '';
  const q = collection(db, 'urbanComments');
  const snapshot = await getDocs(q);
  const filtered = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.postId === postId) {
      filtered.push({ id: docSnap.id, ...data });
    }
  });

  filtered.sort((a, b) => b.timestamp - a.timestamp);
  filtered.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <div><strong>${comment.nickname || '익명'}:</strong> <span>${comment.text}</span></div>
      ${currentUser?.uid === comment.uid ? `
        <button data-id="${comment.id}" class="editBtn">수정</button>
        <button data-id="${comment.id}" class="deleteBtn">삭제</button>
      ` : ''}
    `;
    commentList.appendChild(div);
  });

  commentList.querySelectorAll('.editBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const newText = prompt('수정할 내용을 입력하세요');
      if (newText) {
        await updateDoc(doc(db, 'urbanComments', id), { text: newText });
        loadComments(postId);
      }
    });
  });

  commentList.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('삭제하시겠습니까?')) {
        await deleteDoc(doc(db, 'urbanComments', id));
        loadComments(postId);
      }
    });
  });
}

function setupCommentSection(postId) {
  const form = document.getElementById('commentForm');
  const input = document.getElementById('commentInput');
  if (!form || !input) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) {
      alert('로그인이 필요합니다');
      return;
    }
    const text = input.value.trim();
    if (!text) return;

    let nickname = '익명';
    try {
      nickname = await getUserNickname(currentUser.uid);
    } catch (e) {
      console.warn('닉네임 가져오기 실패:', e);
    }

    try {
      await addDoc(collection(db, 'urbanComments'), {
        postId,
        uid: currentUser.uid,
        nickname,
        text,
        timestamp: Date.now()
      });

      input.value = '';
      loadComments(postId);
    } catch (e) {
      alert('댓글 저장 실패: ' + e.message);
      console.error(e);
    }
  });

  loadComments(postId);
}

function renderUrbanDetail(id) {
  const urbanList = document.getElementById('urbanList');
  const data = urbanData.find(item => item.id === id);
  if (!data) return;
  const titleElem = document.querySelector('.urban-title');
  if (titleElem) titleElem.textContent = data.title;

  // 상세 뷰 HTML + 오디오 버튼 & <audio> 태그 포함
  urbanList.innerHTML = `
    <div class="product-card urban-item urban-detail" style="width:100%;max-width:1200px;margin:0 auto; position: relative;">
      <!-- 음성 모드 버튼 -->
      <div class="voice-mode" style="position:absolute; top:1rem; right:1rem;">
        <button id="playVoiceBtn" style="background:#444; color:#fff; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;">
          🎧 음성 모드
        </button>
        <audio id="urbanVoiceAudio" style="display:none; margin-top:0.5rem; width:100%;">
          <source src="audio/urban${id}.mp3" type="audio/mpeg">
          브라우저가 오디오를 지원하지 않습니다.
        </audio>
      </div>

      <div class="urban-item-title" style="font-size:1.5rem;margin-bottom:0.6rem;">${data.title}</div>
      <div class="urban-item-meta">
        <span>${data.date}</span>
      </div>
      <div style="color:#e01c1c;font-size:1rem;margin-bottom:0.8rem;">공포 난이도: ${renderLevelStars(data.level)}</div>
      <div class="urban-item-body" style="margin-top:1.2rem; font-size:1.1rem; line-height:1.7;">${data.detail}</div>

      <div class="like-section" style="margin-top: 1rem;">
        <button id="likeBtn">❤️ 좋아요</button> <span id="likeCount">0</span>
      </div>

      <div class="comment-section" style="margin-top:2rem;">
        <form id="commentForm">
          <input type="text" id="commentInput" placeholder="댓글을 입력하세요" required />
          <button type="submit">댓글 작성</button>
        </form>
        <div id="commentList"></div>
      </div>

      <button class="urban-back-btn" style="margin-top:2rem; background:#222;color:#fafafa;border:none;padding:0.7rem 1.6rem;border-radius:8px;cursor:pointer;">
        목록으로
      </button>
    </div>
  `;

  // “목록으로” 클릭 시 뒤로가기
  document.querySelector('.urban-back-btn').addEventListener('click', () => {
    window.history.back();
  });

  // 좋아요·댓글 기능 초기화
  setupLikeButton(id);
  setupCommentSection(id);

  // —— 오디오 기능 로직 —— //
  const playBtn = document.getElementById('playVoiceBtn');
  const audioEl = document.getElementById('urbanVoiceAudio');
  // localStorage에 저장된 상태 불러오기 (on/off)
  let voicePlaying = localStorage.getItem('voiceModeStatus') === 'on';

  function updateVoiceState(play) {
    if (play) {
      audioEl.style.display = 'block';
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      playBtn.textContent = '🎧 음성 모드 ON';
      localStorage.setItem('voiceModeStatus', 'on');
    } else {
      audioEl.pause();
      audioEl.style.display = 'none';
      playBtn.textContent = '🎧 음성 모드 OFF';
      localStorage.setItem('voiceModeStatus', 'off');
    }
  }

  // 상세 진입 시 저장된 상태로 초기값 반영
  updateVoiceState(voicePlaying);

  // 버튼 클릭 시 토글
  playBtn.addEventListener('click', () => {
    voicePlaying = !voicePlaying;
    updateVoiceState(voicePlaying);
  });
}

const filterTitles = {
  all: '전체 괴담 모음',
  korea: '한국 괴담',
  foreign: '해외 괴담',
  true: '실화 이야기',
  user: '사용자 제보 괴담'
};

export const urbanData = [
  {
    id: 1,
    title: '층간소음',
    likes: 1000,
    date: '2025-05-20',
    filter: 'korea',
    level: 4,
    thumb: 'image/urban1.png',
    body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분에 뒤를 돌아봤지만 아무도 없었다. 하지만 발소리는 점점 가까워졌다...',
    detail: `우리 집은 어릴 적엔 꽤 부유하게 살았어요.
            그런데 어느 날, 아빠 사업이 잘 안 되면서 집이 잠깐 휘청했죠.\n
            그래서 어쩔 수 없이 서울에 있던 집을 팔고,
            경기도 광주로 이사를 가게 됐어요.
            지금이야 신도시로 발전했지만, 그땐 정말 시골이었거든요.\n
            우리가 이사 간 곳은 굉장히 낡은 빌라였어요.
            10세대 정도가 사는 5층짜리였는데, 엄청 허름했죠.
            엘리베이터도 없고, 복도도 삐걱거리고 바람 소리도 쎘어요.\n
            처음엔 그냥 그런가보다 하고 살았는데,
            어느 날부터 새벽마다 쿵, 쿵쿵쿵쿵...
            발 망치 소리가 들리기 시작했어요.\n
            처음엔 빌라가 낡아서 그런 줄 알았죠.
            그런데 그게 단순히 화장실 왔다 갔다 하는 수준이 아니었어요.\n
            층간소음을 당해본 분은 아실 거예요.
            귀가 한번 트이면 매일매일이 고통이죠.\n
            며칠은 참았는데, 결국 부모님도 못 참고 새벽에 깼어요.
            아빠가 올라가보겠다고 했는데,
            엄마가 새벽엔 예의가 아니라면서 다음날 아침에 가보기로 했죠.\n
            그래서 아빠가 다음날 아침, 윗집에 올라가서 초인종을 눌렀어요.
            근데 아무도 안 나오더래요.
            출근했나? 싶어서 저녁에 다시 가봤는데, 또 아무도 없었어요.
            문에 귀를 대보니 인기척도 없고, 그냥 조용했대요.\n
            그런데 그날 밤, 또 쿵쿵 쿵쿵 소리가 들렸어요.
            다음날도 똑같았어요.
            아빠가 아침, 저녁 두 번 다 가봤는데, 아무도 안 나오는 거예요.\n
            결국 그날 저녁엔 아빠가 진짜 열받아서,
            문을 쿵쿵쿵 두드리면서 소리를 질렀대요.
            \n
            “저기요!! 거기 아무도 없어요?!!!”
            \n
            그랬더니 앞집 사람이 나와서 그러더래요.
            \n
            “거기 아무도 안 산지 좀 됐어요...”
            \n
            그런데 그날 밤에도... 또 쿵쿵 쿵쿵... 소리가 났어요.
            정말 이상했죠.\n
            그래서 새벽에 아빠가 또 윗집에 올라가 봤지만,
            역시나 아무도 없었어요.\n
            결국 다음 날, 아빠가 동네 파출소에 가서 사정을 설명하고
            경찰 아저씨들이랑 그 집에 들어가 봤어요.\n
            그런데 집 안에 들어가자마자...
            곰팡이랑 거미줄이 장난 아니게 쳐져 있었대요.
            사람이 살고 있는 흔적은커녕,
            발 디딜 틈도 없을 정도였대요.\n
            그때 아빠는 직감했대요.\n
            ‘이거 사람이 내는 소리가 아니구나.’\n
            그래서 엄마가 여기저기 소문을 내서
            용하다는 무당분들을 모셔왔어요.
            \n
            무당 아저씨 한 명이,
            무당 아주머니 두 분을 데리고 윗집으로 올라가셨는데요,
            한 시간 넘게 둘러보시더니, 뭔가 이상하다고 하시더래요.\n
            분명 귀신 냄새는 나는데, 귀신이 안 보인다는 거예요.\n
            그래도 그냥 보내긴 뭐하니까
            엄마가 “그냥 음료라도 한 잔 하고 가세요.” 하고
            우리 집으로 모셔왔죠.\n
            그런데 무당 아저씨가 집에 들어오자마자...
            코피를 주르륵 흘리셨어요.\n
            그리고는 갑자기 엄마, 아빠를 부르더니 이렇게 말씀하셨어요.
            \n
            “최대한 빨리 이 집에서 이사 가세요.”
            \n
            엄마가 놀라서 이유를 물었더니...
            \n
            “쿵쿵대고 걸어다니는 귀신이...
            윗집에 있는 게 아니라...
            지금 이 집 ‘천장에 거꾸로 매달려서’
            걸어다니고 있어요!”
            \n
            그날 새벽, 우리 가족은
            가구며 가전이며 전부 다 두고
            서울로 올라가서 단칸방으로 이사했어요.\n
            어릴 때 일이긴 하지만,
            그 오싹했던 분위기는 지금도 또렷하게 기억나요.`
  },
  {
    id: 2,
    title: '하나코야 놀자',
    likes: 100,
    date: '2025-05-18',
    filter: 'foreign',
    level: 4,
    thumb: 'image/urban2.png',
    body: '우리 학교에는 밤마다 혼자 남아 있으면 들린다는 피아노 소리에 대한 소문이 있다. 실제로 경험한 친구의 이야기를 들었다...',
    detail: `이 이야기는, 일본의 한 초등학교에서 시작된다.
            오래된 3층 여자 화장실.
            그 마지막 칸에는, 아무도 들어가려 하지 않았다.
            아이들은 말했다.
            그곳에는 하나코라는 소녀가 산다고.\n
            수십 년 전, 그 화장실에서 사라진 아이.
            지금도 그 이름을 부르면… 대답이 돌아온다고.
            하지만 유이에게 그런 이야기는 그저 아이들의 헛소문에 불과했다.
            귀신 같은 게 있을 리 없다고, 겁 많은 애들이 지어낸 이야기일 뿐이라고 생각했다.
            그녀의 친구 나나는 그런 유이를 걱정스러운 눈으로 바라보았지만,
            유이는 오히려 소문이 진짜인지 확인해보겠다고 말했다.
            나나는 불안한 표정을 숨기지 못했지만, 결국 유이를 따라 나섰다.
            \n
            그날 방과 후,
            학교는 이미 조용했고, 햇살은 복도 끝 그림자를 길게 늘이고 있었다.
            유이는 말없이 3층으로 향했고, 나나는 그 뒤를 조용히 따랐다.\n
            3층은 낮인데도 어두웠다.
            형광등은 일부가 꺼져 있었고, 창문은 먼지로 흐려져 있었다.
            두 사람은 여자 화장실 앞에 멈춰 섰다.\n
            문을 열자, 화장실 안은 싸늘했고, 습기가 가득했다.
            유이는 말없이 마지막 칸 앞에 섰다.
            그리고 조용히 이름을 불렀다.
            \n
            "하나코야, 놀자."\n
            "하나코야, 놀자."\n
            "하나코야, 놀자."
            \n
            그 순간, 안에서 작은 소리가 들렸다.
            너무 작지만… 너무도 또렷하게.
            \n
            “응… 나 여기 있어.”
            \n
            정적이 흘렀다.
            그 소리는 착각이 아니었다.
            나나는 겁에 질려 뒤로 물러났고,
            유이는 떨리는 손으로 마지막 칸의 문손잡이를 잡았다.
            장난일 거라고 스스로를 다독이며, 천천히 문을 열었다.\n
            안은 어두웠지만, 그 아이는 분명히 보였다.
            흰 세일러복을 입은 여자아이.
            고개를 깊게 숙이고 서 있었고,
            머리카락은 얼굴을 가린 채, 가만히 움직이지 않았다.
            그녀의 발은… 바닥에 닿아 있지 않았다.
            유이는 뒤로 한 걸음 물러섰다.
            몸이 굳었고, 말이 나오지 않았다.\n
            그 순간, 그 아이가 고개를 들었다.
            하얗게 질린 얼굴,
            그리고 입가엔 부자연스러운 미소가 걸려 있었다.
            다정하다고 하기엔 너무 조용하고,
            잔인하다고 하기엔 너무 무표정한 미소.
            그리고 아이는 속삭이듯 말했다.
            \n
            “같이 놀자.”
            \n
            그 말과 함께 문이 쾅 하고 닫혔다.
            갑작스러운 소리에 나나는 비명을 질렀고,
            문을 열기 위해 필사적으로 손잡이를 잡았지만,
            문은 단단히 잠겨 있었다.
            화장실 안에서는 아무 소리도 들리지 않았다.
            \n
            그리고—
            유이는 사라졌다.
            다음 날, 유이는 학교에 오지 않았다.
            가방은 책상 위에 그대로 놓여 있었고,
            핸드폰은 꺼져 있었다.\n
            그날 이후로 3층 화장실은 봉쇄되었다.
            사건은 그렇게 끝나는 듯 보였다.\n
            하지만… 그날 이후로 이상한 소문이 다시 떠돌기 시작했다.
            늦은 오후, 복도를 지나가던 학생들 중 몇몇은
            누군가 말하는 소리를 들었다고 했다.
            분명히, 조용한 목소리였다.
            \n
            “하나코야… 놀자…”
            \n
            그 목소리는 때때로,
            화장실 안에서가 아니라—
            복도 한복판에서 들려왔다.`
  },
  {
    id: 3,
    title: '장충동 목욕탕 살인사건',
    likes: 0,
    date: '2025-05-21',
    filter: 'true',
    level: 5,
    thumb: 'image/urban3.png',
    body: '엘리베이터에 홀로 타고 있는데, 누군가 버튼을 누른 것도 아닌데 갑자기 13층에 멈췄다. 문이 열리고 아무도 없었다...',
    detail: `엘리베이터를 타고 가던 중, 목적지와는 전혀 상관없는 13층에서 멈췄고, 문이 열렸지만 아무도 없었습니다. 괜히 오싹해서 바로 닫힘 버튼을 [...]`
  },
  {
    id: 4,
    title: '졸음운전',
    likes: 0,
    date: '2025-05-19',
    filter: 'user',
    level: 1,
    thumb: 'image/urban4.png',
    body: '이 이야기는 실제로 내가 겪은 일이다...',
    detail: `어릴 적 시골집에서 혼자 잠을 자는데 누군가 이불을 잡아당기는 느낌이 들었습니다. 눈을 떠보니 아무도 없었고, 이불은 그대로였습니다. [...]`
  }
];

function renderUrbanList(sortType, filterType) {
  let list = [...urbanData];
  if (filterType && filterType !== 'all') {
    list = list.filter(item => item.filter === filterType);
  }
  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'popular') {
    list.sort((a, b) => b.likes - a.likes);
  } else if (sortType === 'level') {
    list.sort((a, b) => b.level - a.level);
  }

  const urbanList = document.getElementById('urbanList');
  urbanList.innerHTML = list.map(item => `
    <div class="product-card urban-item" data-id="${item.id}" style="cursor:pointer;">
      <img src="${item.thumb}" alt="${item.title}">
      <div class="urban-item-title" style="margin-bottom:0.5rem;">${item.title}</div>
      <div class="urban-item-meta" style="margin-bottom:0.4rem;">
        <span>좋아요 ${item.likes}개</span>
        <span>${item.date}</span>
      </div>
      <div style="color:#e01c1c;font-size:0.95rem;margin-bottom:0.2rem;">공포 난이도: ${renderLevelStars(item.level)}</div>
    </div>
  `).join('');

  document.querySelectorAll('.urban-item').forEach(itemElem => {
    itemElem.addEventListener('click', function () {
      const clickId = this.getAttribute('data-id');
      window.history.pushState({}, '', `?id=${clickId}`);
      renderUrbanDetail(parseInt(clickId, 10));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('urbanList')) {
    let sortType = 'latest';
    let filterType = getParamFromURL('filter') || 'all';
    const idParam = getParamFromURL('id');

    if (idParam) {
      renderUrbanDetail(parseInt(idParam, 10));
    } else {
      renderUrbanList(sortType, filterType);
      updateUrbanTitle(filterType);
    }

    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        sortType = this.dataset.sort;
        renderUrbanList(sortType, filterType);
        updateUrbanTitle(filterType);
      });
    });

    const urbanMenu = document.getElementById('urbanMenu');
    if (urbanMenu) {
      urbanMenu.querySelectorAll('.submenu a').forEach(link => {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          const url = new URL(this.href);
          const newFilter = url.searchParams.get('filter') || 'all';
          filterType = newFilter;
          window.history.pushState({}, '', url.pathname + url.search);
          renderUrbanList(sortType, filterType);
          updateUrbanTitle(filterType);
        });
      });
    }

    window.addEventListener('popstate', function () {
      const idParam = getParamFromURL('id');
      filterType = getParamFromURL('filter') || 'all';
      if (idParam) {
        renderUrbanDetail(parseInt(idParam, 10));
      } else {
        renderUrbanList(sortType, filterType);
        updateUrbanTitle(filterType);
      }
    });
  }
});
