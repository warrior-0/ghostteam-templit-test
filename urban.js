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
    likeCount.textContent = data.count || 0;

    likeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('로그인이 필요합니다');
        return;
      }
      const uid = currentUser.uid;
      if (data.users?.includes(uid)) {
        alert('이미 좋아요를 누르셨습니다');
        return;
      }
      data.count = (data.count || 0) + 1;
      data.users = [...(data.users || []), uid];
      await setDoc(postRef, data);
      likeCount.textContent = data.count;
    });
  });

  // ✅ 좋아요 버튼에 CSS 스타일 추가
  Object.assign(likeBtn.style, {
    backgroundColor: '#e01c1c',
    color: '#ffffff',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
    transition: 'transform 0.1s ease, background-color 0.2s ease'
  });

  likeBtn.addEventListener('mouseenter', () => {
    likeBtn.style.backgroundColor = '#c41818';
  });

  likeBtn.addEventListener('mouseleave', () => {
    likeBtn.style.backgroundColor = '#e01c1c';
    likeBtn.style.transform = 'scale(1)';
  });

  likeBtn.addEventListener('mousedown', () => {
    likeBtn.style.transform = 'scale(0.95)';
  });

  likeBtn.addEventListener('mouseup', () => {
    likeBtn.style.transform = 'scale(1)';
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

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("click-image")) {
    const imgUrl = e.target.getAttribute("data-img");
    const shouldShake = e.target.getAttribute("data-shake") === "true";

    const popup = document.createElement("div");
    popup.className = "fullscreen-popup";

    if (shouldShake) {
      popup.classList.add("shake");
    }

    popup.style.backgroundImage = `url(${imgUrl})`;
    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 1500);
  }
});
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
    likes: 13,
    date: '2025-05-20',
    filter: 'korea',
    level: 4,
    thumb: 'image/urban1.webp',
    body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분에 뒤를 돌아봤지만 아무도 없었다. 하지만 발소리는 점점 가까워졌다...',
    detail: `
    <div class="story-content">
      <!-- 어린 시절과 이사 -->
      <section class="story-section">
        <p>우리 집은 어릴 적엔 꽤 부유하게 살았어요.</p>
        <p>그런데 어느 날, 아빠 사업이 잘 안 되면서 집이 잠깐 휘청했죠.</p>
        <p>그래서 어쩔 수 없이 서울에 있던 집을 팔고, 경기도 광주로 이사를 가게 됐어요.</p>
        <p>지금이야 신도시로 발전했지만, 그땐 정말 시골이었거든요.</p>
      </section>
    
      <!-- 낡은 빌라와 첫 번째 이상 신호 -->
      <section class="story-section">
        <p>우리가 이사 간 곳은 굉장히 낡은 빌라였어요. 10세대 정도가 사는 5층짜리였는데, 엄청 허름했죠.</p>
        <p>엘리베이터도 없고, 복도도 삐걱거리고 바람 소리도 세서 밤마다 무서웠어요.</p>
        <p>처음엔 그냥 그런가 보다 하고 살았는데, 어느 날부터 새벽마다 <strong>쿵, 쿵쿵쿵쿵...</strong> 발 망치 소리가 들리기 시작했어요.</p>
        <p>처음엔 빌라가 낡아서 그런 줄 알았죠. 그런데 그게 단순히 화장실 왔다 갔다 하는 수준이 아니었어요.</p>
      </section>
    
      <!-- 위층 방문 시도 -->
      <section class="story-section">
        <p>층간소음을 당해본 분은 아실 거예요. 귀가 한 번 트이면 매일매일이 고통이죠.</p>
        <p>며칠은 참았는데, 결국 부모님도 못 참고 새벽에 깼어요.</p>
        <p>아빠가 올라가보겠다고 했는데, 엄마가 “새벽엔 예의가 아니다”라면서 다음날 아침에 가보기로 했죠.</p>
        <p>그래서 아빠가 다음날 아침 윗집에 올라가서 초인종을 눌렀어요. 근데 아무도 안 나오더래요.</p>
        <p>출근했나 싶어서 저녁에 다시 가봤는데, 또 아무도 없었어요. 문에 귀를 대보니 인기척도 없고, 그냥 조용했대요.</p>
      </section>
    
      <!-- 반복되는 이상 현상 -->
      <section class="story-section">
        <p>그런데 그날 밤, 또 <strong>쿵쿵쿵쿵...</strong> 소리가 들렸어요. 다음날도 똑같았어요.</p>
        <p>아빠가 아침·저녁 두 번 다 가봤는데, 아무도 안 나오는 거예요.</p>
        <p>결국 그날 저녁엔 아빠가 진짜 열 받아서 문을 쿵쿵 노크하며 소리를 지렀대요.</p>
        <p>"저기요!! 거기 아무도 없어요?!!!"</p>
        <p>그랬더니 앞집 사람이 나와서 그러더래요. "거기 아무도 안 산 지 좀 됐어요..."</p>
        <p>근데 그날 밤에도... 또 <strong>쿵쿵쿵쿵...</strong> 소리가 났어요. 정말 이상했죠.</p>
      </section>
    
      <!-- 경찰 조사 -->
      <section class="story-section">
        <p>그래서 새벽에 아빠가 또 윗집에 올라가 봤지만, 역시나 아무도 없었어요.</p>
        <p>결국 다음 날 아빠가 동네 파출소에 가서 사정을 설명하고, 경찰 아저씨들과 그 집에 들어가 봤어요.</p>
        <p>집 안에 들어가자마자... 곰팡이랑 거미줄이 장난 아니게 쳐져 있었대요.</p>
        <p>사람이 살고 있는 흔적은커녕, 발 디딜 틈도 없이 폐허 같았다고 해요.</p>
        <p>그때 아빠는 직감했대요. ‘이거 사람이 내는 소리가 아니구나.’</p>
      </section>
    
      <!-- 무당 초빙 -->
      <section class="story-section">
        <p>그래서 엄마가 무당분들을 모셔왔어요. 무당 아저씨 한 분과 무당 아주머니 두 분을 함께요.</p>
        <p>윗집으로 올라가 한 시간 넘게 둘러보시더니, “귀신 냄새는 나는데 귀신이 안 보인다” 하셨대요.</p>
        <p>그래도 그냥 보내긴 뭐하니까, 엄마가 “음료라도 한 잔 하고 가세요” 하고 우리 집으로 모셔왔죠.</p>
        <p>그런데 무당 아저씨가 집에 들어오자마자... 코피를 주르륵 흘리셨대요.</p>
        <p>그리고 갑자기 말씀하셨대요. “최대한 빨리 이 집에서 이사 가세요.”</p>
        <p>엄마가 이유를 물었더니... “쿵쿵대고 걸어다니는 귀신이 윗집에 있는 게 아니라 지금 이 집 <strong>천장에 거꾸로</strong> 걸어다니고 있어요!”</p>
      </section>
    
      <!-- 대피와 회상 -->
      <section class="story-section">
        <p>그날 새벽, 우리 가족은 가구며 가전이며 전부 두고 서울로 올라가 단칸방으로 이사했어요.</p>
        <p>어릴 때 일이긴 하지만, 그 오싹했던 분위기는 지금도 또렷하게 기억나요.</p>
      </section>
    </div>
    `
  },
  {
    id: 2,
    title: '하나코야 놀자',
    likes: 25,
    date: '2025-05-18',
    filter: 'foreign',
    level: 4,
    thumb: 'image/urban2.webp',
    body: '우리 학교에는 밤마다 혼자 남아 있으면 들린다는 피아노 소리에 대한 소문이 있다. 실제로 경험한 친구의 이야기를 들었다...',
    detail: `
      <div class="story-content">
        <!-- 도입부 -->
        <section class="story-section">
          <p>이 이야기는, 일본의 한 초등학교에서 시작된다.</p>
          <p>오래된 3층 여자 화장실. 그 마지막 칸에는, 아무도 들어가려 하지 않았다.</p>
          <p>아이들은 말했다. 그곳에는 하나코라는 소녀가 산다고.</p>
          <p>수십 년 전, 그 화장실에서 사라진 아이. 지금도 그 이름을 부르면… 대답이 돌아온다고.</p>
          <p>하지만 유이에게 그런 이야기는 그저 아이들의 헛소문에 불과했다. 귀신 같은 게 있을 리 없다고, 겁 많은 애들이 지어낸 이야기일 뿐이라고 생각했다.</p>
          <p>그녀의 친구 나나는 그런 유이를 걱정스러운 눈으로 바라보았지만, 유이는 오히려 소문이 진짜인지 확인해보겠다고 말했다. 나나는 불안한 표정을 숨기지 못했지만, 결국 유이를 따라 나섰다.</p>
        </section>
      
        <!-- 3층으로 향하는 발걸음 -->
        <section class="story-section">
          <p>그날 방과 후, 학교는 이미 조용했고, 햇살은 복도 끝 그림자를 길게 늘이고 있었다.</p>
          <p>유이는 말없이 3층으로 향했고, 나나는 그 뒤를 조용히 따랐다.</p>
          <p>3층은 낮인데도 어두웠다. 형광등은 일부가 꺼져 있었고, 창문은 먼지로 흐려져 있었다. 두 사람은 여자 화장실 앞에 멈춰 섰다.</p>
        </section>
      
        <!-- 문을 여는 순간 -->
        <section class="story-section">
          <p>문을 열자, 화장실 안은 싸늘했고, 습기가 가득했다. 유이는 말없이 마지막 칸 앞에 섰다. 그리고 조용히 이름을 불렀다.</p>
          <p><span class="click-image" data-img="image/urban1.webp" data-shake="false">"하나코야, 놀자."</span><span class="click-hint"><- 클릭!</span></p>
          <p>"하나코야, 놀자."</p>
          <p>"하나코야, 놀자."</p>
          <p>그 순간, 안에서 작은 소리가 들렸다. 너무 작지만… 너무도 또렷하게.</p>
        </section>
      
        <!-- 대답과 정적 -->
        <section class="story-section">
          <p>“응… 나 여기 있어.”</p>
          <p>정적이 흘렀다. 그 소리는 착각이 아니었다.</p>
        </section>
      
        <!-- 문을 열고 마주한 아이 -->
        <section class="story-section">
          <p>나나는 겁에 질려 뒤로 물러났고, 유이는 떨리는 손으로 마지막 칸의 문손잡이를 잡았다. 장난일 거라고 스스로를 다독이며, 천천히 문을 열었다.</p>
        </section>
      
        <section class="story-section">
          <p>안은 어두웠지만, 그 아이는 분명히 보였다. 흰 세일러복을 입은 여자아이. 고개를 깊게 숙이고 서 있었고, 머리카락은 얼굴을 가린 채, 가만히 움직이지 않았다. 그녀의 발은… 바닥에 닿아 있지 않았다.</p>
          <p>유이는 뒤로 한 걸음 물러섰다. 몸이 굳었고, 말이 나오지 않았다.</p>
        </section>
      
        <!-- 아이의 미소와 속삭임 -->
        <section class="story-section">
          <p>그 순간, 그 아이가 고개를 들었다. 하얗게 질린 얼굴, 그리고 입가엔 부자연스러운 미소가 걸려 있었다. 다정하다고 하기엔 너무 조용하고, 잔인하다고 하기엔 너무 무표정한 미소. 그리고 아이는 속삭이듯 말했다.</p>
          <p>“같이 놀자.”</p>
        </section>
      
        <!-- 문이 닫히고 비명 -->
        <section class="story-section">
          <p>그 말과 함께 문이 쾅 하고 닫혔다. 갑작스러운 소리에 나나는 비명을 질렀고, 문을 열기 위해 필사적으로 손잡이를 잡았지만, 문은 단단히 잠겨 있었다. 화장실 안에서는 아무 소리도 들리지 않았다.</p>
        </section>
      
        <!-- 사라진 유이 -->
        <section class="story-section">
          <p>그리고— 유이는 사라졌다. 다음 날, 유이는 학교에 오지 않았다. 가방은 책상 위에 그대로 놓여 있었고, 핸드폰은 꺼져 있었다.</p>
        </section>
      
        <!-- 사건 이후 -->
        <section class="story-section">
          <p>그날 이후로 3층 화장실은 봉쇄되었다. 사건은 그렇게 끝나는 듯 보였다.</p>
        </section>
      
        <!-- 이상한 소문 -->
        <section class="story-section">
          <p>하지만… 그날 이후로 이상한 소문이 다시 떠돌기 시작했다. 늦은 오후, 복도를 지나가던 학생들 중 몇몇은 누군가 말하는 소리를 들었다고 했다. 분명히, 조용한 목소리였다.</p>
          <p>“하나코야… 놀자…”</p>
          <p>그 목소리는 때때로, 화장실 안에서가 아니라— 복도 한복판에서 들려왔다.</p>
        </section>
      </div>
    `
  },
  {
    id: 3,
    title: '장충동 목욕탕 살인사건',
    likes: 9,
    date: '2025-05-21',
    filter: 'true',
    level: 5,
    thumb: 'image/urban3.webp',
    body: '엘리베이터에 홀로 타고 있는데, 누군가 버튼을 누른 것도 아닌데 갑자기 13층에 멈췄다. 문이 열리고 아무도 없었다...',
    detail: `
      <div class="story-content">
        <!-- 1985년대 배경 및 목욕탕 사장 소개 -->
        <section class="story-section">
          <p>1985년대에 우리나라에는 대중 목욕탕이 많았다.</p>
          <p>금요일 저녁 7시 반을 넘어 장충동에 위치한 대중 목욕탕 사장 K 씨는 손님도 다 나가고 슬슬 문 닫을 준비를 했다.</p>
          <p>마침 비가 억수같이 쏟아져 손님도 별로 없던 터라 평소보다 일찍 닫으려던 찰나였다.</p>
        </section>
      
        <!-- 수상한 손님 등장 -->
        <section class="story-section">
          <p>그때 한 여인이 터벅터벅 목욕탕 입구로 걸어왔다. 빨간 우산에 빨간 코트 형태의 우의를 입고, 입술은 떨리고 몸을 부들부들 떨고 있었다.</p>
          <p>"저기요... 혹시 영업 안 하세요...?"</p>
          <p>사장은 “아, 비도 많이 오고 이제 문 닫으려는 참입니다”라 답했지만, 여인은 “샤워만 하고 나올게요… 제발요…”라 애원했다.</p>
        </section>
      
        <!-- 부탁 수락과 시간 경과 -->
        <section class="story-section">
          <p>사장은 안쓰러워 여자의 부탁을 수락했다. “몸만 잠깐 담그고 바로 나오세요.”</p>
          <p>여자는 고맙다는 듯 탕 속으로 들어갔고, 시간은 흘러 8시 반이 넘어갔다.</p>
          <p>청소 직원은 이미 퇴근했고, 사장은 문 닫을 준비를 위해 여탕 입구를 두들기며 “손님, 1시간 다 돼갑니다. 마무리하시고 나와주세요”라 외쳤다.</p>
        </section>
      
        <!-- 침묵과 공포 -->
        <section class="story-section">
          <p>몇 번의 노크에도 인기척이 없자 사장은 망설이다 문을 열었다.</p>
          <p>탕 속은 온통 붉은색으로 물들어 있었고, 여인은 두 눈을 부릅뜨고 사장을 바라보고 있었다.</p>
        </section>
      
        <!-- 수사와 미스터리 -->
        <section class="story-section">
          <p>경찰 신고로 수사가 시작되었으나, 사건은 미궁에 빠졌다.</p>
          <p>탕 안에는 사장과 이 여인뿐이었고, 여인은 회칼 같은 날카로운 도구에 난도질당해 사망했다.</p>
          <p>살해 도구도, 자살인지 타살인지도 밝혀지지 않았다.</p>
          <p>유력 용의자였던 사장은 10년 넘게 목욕탕을 운영하며 가족과 지내던 평범한 인물이었다.</p>
        </section>
      
        <!-- 결말 및 여파 -->
        <section class="story-section">
          <p>결국 사장은 목욕탕을 처분하고 지방으로 이사갔다고 전해진다.</p>
        </section>
      </div>
    `
  },
  {
    id: 4,
    title: '졸음운전',
    likes: 0,
    date: '2025-05-19',
    filter: 'user',
    level: 1,
    thumb: 'image/urban4.webp',
    body: '이 이야기는 실제로 내가 겪은 일이다...',
    detail: `
      <div class="story-content">
        <!-- 운전병 근무 배경 -->
        <section class="story-section">
          <p>제가 운전병 때 겪은 일입니다.</p>
          <p>군대에서 운전병, 그 중에서도 연대장님 운전병으로 근무를 했고, 부대 안은 물론 부대 밖에서도 연대장님이 부르시면 언제든 차를 가지고 모시러 갔습니다.</p>
        </section>
      
        <!-- 새벽 호출 -->
        <section class="story-section">
          <p>어느 날 새벽 1시쯤, 당직 사관이 연대장님 연락 왔다며 저를 깨웠습니다.</p>
          <p>전화를 받아보니 연대장님이 친구와 잠시 놀러 가셨는데 술을 많이 마셔 태우러 오라는 지시였죠.</p>
          <p>병사는 단독으로 부대 밖으로 나갈 수 없지만, 연대장님의 특별 지시 덕분에 저는 부대 밖으로 나올 수 있었습니다.</p>
        </section>
      
        <!-- 산길 운전과 소녀 발견 -->
        <section class="story-section">
          <p>부대가 산속에 있어 조용히 산길을 내려가고 있는데, 멀리서 8살쯤 되어 보이는 여자아이가 길가에 혼자 서 있더라고요.</p>
          <p>'이 시간에 웬 여자아이가 있지? 늦으면 혼나는데 그냥 못 본 척 지나갈까… 아니면 집까지 데려다주고 갈까' 고민하다, 결국 아이를 태우기로 했습니다.</p>
        </section>
      
        <!-- 아이 태우고 대화 -->
        <section class="story-section">
          <p>차를 세우고 창문을 내린 뒤 말 걸었죠. "꼬마야~ 여기서 뭐해? 위험하니까 일단 오빠가 집까지 태워줄게"</p>
          <p>아이는 말없이 조용히 뒷좌석에 탔습니다. 여러 말을 걸어도 대답 없이 고개만 숙인 채 바닥만 바라보고 있었죠.</p>
          <p>'많이 놀랐나… 일단 연대장님 먼저 모시고 나중에 얘기하자' 생각하며 운전을 계속하던 중, 아이가 갑자기 물었습니다.</p>
          <p>"아저씨… 살고 싶어요? 죽고 싶어요?"</p>
        </section>
      
        <!-- 졸음운전 경고 -->
        <section class="story-section">
          <p>처음엔 당황해 못 들은 척했지만, 아이는 다시 물었어요. "아저씨, 살고 싶어요? 죽고 싶어요?"</p>
          <p>제가 "당연히… 살고 싶지…"라고 대답하자, 아이가 외쳤습니다. "그럼 일어나요!!!!!"</p>
          <p>그 외침에 정신이 번쩍 들어 보니, 제가 졸음운전으로 산 아래 낭떠러지로 거의 떨어질 뻔한 순간이었습니다.</p>
        </section>
      
        <!-- 아이의 사라짐 -->
        <section class="story-section">
          <p>급히 차를 멈추고 뒷좌석을 돌아봤지만, 아이는 사라져 있었습니다.</p>
          <p>모두… 꿈이었던 거죠.</p>
        </section>
      </div>
    `
  },
  {
    id: 5,
    title: '석류나무 옆 담벼락',
    likes: 0,
    date: '2025-06-12',
    filter: 'user',
    level: 2,
    thumb: 'image/urban5.webp',
    body: '이 이야기는 실제로 내가 겪은 일이다...',
    detail: `
      <div class="story-content">
        <!-- 경주 방문과 기억 회상 -->
        <section class="story-section">
          <p>얼마 전, 저는 외할머니를 뵙기 위해 오랜만에 경주로 향했습니다.</p>
          <p>몇 년 만에 찾은 외할머니 집은 어릴 적 봤던 모습 그대로였지만… 집 안을 둘러보던 중, 문득 한 가지 기억이 떠올랐습니다.</p>
          <p>어릴 적, 소름 끼칠 정도로 무서웠던 그 일입니다.</p>
        </section>
      
        <!-- 어린 시절 배경 -->
        <section class="story-section">
          <p>당시 부모님은 맞벌이셨고, 저는 대부분의 시간을 외할머니 댁에서 보냈습니다.</p>
          <p>외할머니 집은 넓은 마당이 있는 단층 주택이었고, 마당엔 인공연못이, 대문 근처엔 석류나무 한 그루가 서 있었습니다.</p>
        </section>
      
        <!-- 이상한 기운 감지 -->
        <section class="story-section">
          <p>제가 여섯, 일곱 살쯤 되었을 때였습니다. 그날도 석류나무 옆에서 흙장난을 하고 있었죠.</p>
          <p>담벼락 너머를 볼 수 있었는데, 이상하게 등골이 서늘했고 담 너머에서 기이한 기운이 느껴졌습니다.</p>
        </section>
      
        <!-- 기괴한 형체 목격 -->
        <section class="story-section">
          <p>조심스레 흙을 밟고 올라서 담 너머를 본 순간, 여성의 형체가 공중에 둥둥 떠 있었습니다.</p>
          <p>팔다리는 기괴하게 꺾여 있었고, 눈동자는 없고 입은 벌어져 있었으며, 온몸은 검은 연기 같은 것으로 감싸져 있었습니다.</p>
          <p>그 형체는 천천히 움직이고 있었고, 저는 그 자리에 얼어붙었습니다.</p>
        </section>
      
        <!-- 외할머니의 대응 -->
        <section class="story-section">
          <p>그때, 외할머니가 제 허리를 확 끌어내렸습니다. 저를 누르며 자세를 낮추셨고, 저는 속삭였죠.</p>
          <p>“할머니… 저기에…”</p>
          <p>그러자 할머니는 손가락을 입에 대고 말씀하셨습니다. “조용히 하그라… 조용히 하그라…”</p>
        </section>
      
        <!-- 다시 본 형체 -->
        <section class="story-section">
          <p>할머니는 조심스레 담 너머를 보시고, 저도 함께 봤습니다. 그 형체는 여전히 그 자리에 있었습니다.</p>
          <p>그걸 보자마자 할머니는 다시 제 머리를 꾹 눌렀고, 낮은 목소리로 말씀하셨습니다.</p>
          <p>“조용히 하그라… 아무한테도 말하면 안 된다. 알겠제?”</p>
        </section>
      
        <!-- 기억의 단절 -->
        <section class="story-section">
          <p>이상하게도, 그 뒤로 기억이 끊겼습니다. 마치 누군가 기억을 일부러 지운 것처럼 말이죠.</p>
          <p>그리고 지금, 성인이 되어 다시 외할머니 집에 와서야 그날의 기억이 불쑥 떠오른 것입니다.</p>
          <p>외할머니께 물어보려다, 왠지 묻지 않는 게 좋겠다는 생각이 들었습니다.</p>
        </section>
      </div>
    `
  },
  {
    id: 6,
    title: '광장에 있는 여인',
    likes: 13,
    date: '2025-05-18',
    filter: 'korea',
    level: 3,
    thumb: 'image/urban6.webp',
    body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분에 뒤를 돌아봤지만 아무도 없었다. 하지만 발소리는 점점 가까워졌다...',
    detail: `
      <div class="story-content">
        <!-- 붉은 드레스 여인 소개 -->
        <section class="story-section">
          <p>3년 전쯤이었나… 그때 내가 다니던 회사 근처에 분수 광장이 하나 있었어요.</p>
          <p>그 근처를 맴도는 여자 하나가 있었는데, 한 서른쯤 돼 보였고… 늘 붉은 드레스를 입고 있었죠.</p>
          <p>그 옷은 낡고 오래된 느낌이었고, 구두 소리는 이상할 정도로 불규칙했어요.</p>
        </section>
      
        <!-- 여자 외모 묘사 -->
        <section class="story-section">
          <p>그 여자는 비쩍 마른 몸, 초점 없는 눈, 부스스한 머리… 술집 호객인 줄 알았지만 뭔가 이상했어요.</p>
          <p>저는 눈 마주치지 않으려 애썼죠.</p>
        </section>
      
        <!-- 드러그 스토어 앞에서 -->
        <section class="story-section">
          <p>어느 날 퇴근길에 드러그 스토어에서 화장품 세일을 보고 한 시간 넘게 있었는데, 그 여자는 계속 광장을 돌고 있었어요.</p>
          <p>가게에서 나왔을 때, 분수를 사이에 두고 그 여자가 절 뚫어지게 바라보고 있었죠.</p>
        </section>
      
        <!-- 공포스러운 달리기 -->
        <section class="story-section">
          <p>시력이 나쁜데도 얼굴이 선명하게 보였고, 그 여자는 갑자기 빠르게 저를 향해 달려왔어요.</p>
          <p>눈은 새까맸고, 입꼬리는 비정상적으로 올라가 있었죠.</p>
          <p>몸이 굳은 채 움직일 수 없었는데, 누군가 제 팔을 잡았어요.</p>
        </section>
      
        <!-- 수호령 같은 남자 -->
        <section class="story-section">
          <p>뒤를 돌아보니 남자가 있었고, 쉿— 하며 조용히 하라는 제스처를 했습니다.</p>
          <p>그 남자와 여자가 대치하더니, 여자는 근처 식당으로 사라졌어요.</p>
          <p>남자는 저를 개찰구 근처까지 데려가고 나서야 저를 놓아줬고, 말했죠.</p>
          <p>“오늘은 운이 좋았던 겁니다. 당신의 수호령이 저를 부른 거예요. 다음은 장담 못 합니다.”</p>
        </section>
      
        <!-- 이후의 여운 -->
        <section class="story-section">
          <p>그 말을 듣고 저는 광장을 피했고, 시간이 지나자 다시 그곳을 가보고 싶어졌어요.</p>
          <p>낮에는 아무 일도 없었지만, 해가 질 무렵 이상하게 끌리듯 다시 갔어요.</p>
        </section>
      
        <!-- 다시 마주친 여인 -->
        <section class="story-section">
          <p>계단을 반쯤 내려갔을 때, 붉은 드레스를 입은 여자가 등을 돌린 채 앉아 있었어요.</p>
          <p>그 여자가 꼭두각시처럼 벌떡 일어나자 저는 정신 없이 계단을 뛰어올랐어요.</p>
          <p>그날 이후로 그 길은 쳐다도 안 봤고, 결국 두 달 뒤 회사를 그만뒀어요.</p>
          <p>지금도 가끔 생각해요. 그 여자는… 아직도 그 광장에 있을까요?</p>
        </section>
      </div>
    `
  },
  {
    id: 7,
    title: '택배 왔습니다',
    likes: 0,
    date: '2025-06-04',
    filter: 'user',
    level: 4,
    thumb: 'image/urban7.webp',
    body: '이 이야기는 실제로 내가 겪은 일이다...',
    detail: `
      <div class="story-content">
        <!-- 백수처럼 지내던 시기 -->
        <section class="story-section">
          <p>이건… 작년에 내가 제대한 직후에 겪은 일이에요.</p>
          <p>복학까지 두 달쯤 남았던 나는, 딱히 할 일도 없고 학원 다니기도 귀찮아 그냥 백수처럼 지내고 있었어요.</p>
          <p>밤새 게임하고, 오후쯤 일어나서 TV 보다 해질 무렵엔 괜히 밖에 나갔다 들어오는 무의미한 하루였죠.</p>
        </section>
      
        <!-- 숙취와 이상한 발소리 -->
        <section class="story-section">
          <p>전날 늦게까지 술을 마신 탓에 머리가 울리고, 윙— 하는 소리가 들리던 중에 아래층에서부터 또각… 또각… 구두 소리가 들렸어요.</p>
          <p>제가 사는 집은 상가주택 구조였고, 5층 꼭대기 한 층만 우리 집이었어요. 그런데 소리는 5층까지 올라왔죠.</p>
        </section>
      
        <!-- 인터폰과 이상한 택배 -->
        <section class="story-section">
          <p>현관 벨이 울렸고, "택배 왔습니다" 라는 말에 인터폰을 봤더니 택배기사처럼 보이는 남자가 상자를 들고 있었어요.</p>
          <p>하지만 이상한 느낌이 들어 문을 열지 않고 창밖을 봤는데, 택배 트럭이 없었어요.</p>
        </section>
      
        <!-- 위기감과 대화 -->
        <section class="story-section">
          <p>이상함을 느끼고 "그런 사람 없어요"라고 돌려보냈지만, 남자는 계속 문을 열라고 하며 "목이 마르다", "상자 안이 궁금하지 않냐"며 말을 걸었어요.</p>
        </section>
      
        <!-- 공포의 상자 -->
        <section class="story-section">
          <p>그가 상자를 열어 카메라에 들이댔을 때, 안에는 끔찍하게 난도질당한 고양이 시체가 있었어요.</p>
          <p>그리고는 "너 이름도, 집도, 전화번호도 안다. 오늘은 봐준다"며 협박했어요.</p>
        </section>
      
        <!-- 사진 촬영과 경찰 신고 -->
        <section class="story-section">
          <p>정신 차리고 사진을 찍었고, 그 남자는 천천히 내려가다 4층쯤에서 발소리가 멈췄어요. 전 경찰에 신고했어요.</p>
          <p>경찰이 도착해 수색했지만 그는 이미 사라졌고, 저는 외갓집으로 피신했어요.</p>
        </section>
      
        <!-- 수사와 검거 -->
        <section class="story-section">
          <p>다음 날 강력계 형사에게 연락이 왔고, 조사 결과 그가 최근 강도 살인 사건의 범인이었다는 걸 알게 되었어요.</p>
          <p>보름쯤 후 그는 검거됐고, 저는 다시 집으로 돌아왔어요.</p>
        </section>
      
        <!-- 후유증 -->
        <section class="story-section">
          <p>그 이후로는 어떤 택배든 함부로 믿지 않아요. 지금도 박스를 버릴 땐 꼭 찢어서 버려요.</p>
        </section>
      </div>
    `
  }
];

async function renderUrbanList(sortType, filterType) {
  // 1) Firestore에서 urbanLikes 컬렉션 읽어오기
  const likesSnapshot = await getDocs(collection(db, 'urbanLikes'));
  const firebaseLikes = {};
  likesSnapshot.forEach(docSnap => {
    // 문서 ID가 postId (문자열)라고 가정
    firebaseLikes[docSnap.id] = docSnap.data().count || 0;
  });

  // 2) urbanData와 병합하여 새 배열 생성
  let list = urbanData.map(item => ({
    ...item,
    likes: firebaseLikes[String(item.id)] ?? 0
  }));

  // 3) 필터링
  if (filterType && filterType !== 'all') {
    list = list.filter(item => item.filter === filterType);
  }

  // 4) 정렬
  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'popular') {
    list.sort((a, b) => b.likes - a.likes);
  } else if (sortType === 'level') {
    list.sort((a, b) => b.level - a.level);
  }

  // 5) 렌더링
  const urbanList = document.getElementById('urbanList');
  urbanList.innerHTML = list.map(item => `
    <div class="product-card urban-item" data-id="${item.id}" style="cursor:pointer;">
      <img src="${item.thumb}" alt="${item.title}">
      <div class="urban-item-title" style="margin-bottom:0.5rem;">${item.title}</div>
      <div class="urban-item-meta" style="margin-bottom:0.4rem;">
        <span>좋아요 ${item.likes}개</span>
        <span>${item.date}</span>
      </div>
      <div style="color:#e01c1c;font-size:0.95rem;margin-bottom:0.2rem;">
        공포 난이도: ${renderLevelStars(item.level)}
      </div>
    </div>
  `).join('');

  // 6) 클릭 이벤트 바인딩
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

// ✅ 여기부터 클릭 이미지 팝업 기능 추가
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("click-image")) {
    const imgUrl = e.target.getAttribute("data-img");

    const popup = document.createElement("div");
    popup.className = "fullscreen-popup";
    popup.style.backgroundImage = `url(${imgUrl})`;
    document.body.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 2500);
  }
});
