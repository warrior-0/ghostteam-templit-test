// ✅ urban.js - Firebase 좋아요 연동 및 음성모드 기능 포함 + body/detail 전체 반영

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, getDocs
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
  appId: "1:776945022976:web:105e545d39f12b5d0940e5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
onAuthStateChanged(auth, user => currentUser = user);

export const urbanData = [
  { id: 1, title: '층간소음', date: '2025-05-20', filter: 'korea', level: 4, thumb: 'image/urban1.png', body: '어두운 밤, 골목길을 걷다가 누군가 따라오는 듯한 기분에 뒤를 돌아봤지만 아무도 없었다. 하지만 발소리는 점점 가까워졌다...', detail: '이 이야기는 실제로 2021년 서울의 한 골목에서 벌어진 일입니다. 집에 가던 중, 뒤에서 발소리가 가까워지는 것을 느꼈지만 주위를 둘러봐도 아무도 없어서 무서움에 뛰어갔습니다. 그러나 발소리는 멈추지 않았고, 결국 경찰에 신고하게 되었습니다.' },
  { id: 2, title: '하나코야 놀자', date: '2025-05-18', filter: 'foreign', level: 4, thumb: 'image/urban2.png', body: '우리 학교에는 밤마다 혼자 남아 있으면 들린다는 피아노 소리에 대한 소문이 있다. 실제로 경험한 친구의 이야기를 들었다...', detail: '실제로 친구는 늦게까지 교실에 남아 있었는데, 아무도 없는 음악실에서 피아노 소리가 났다고 합니다. 용기를 내어 가봤지만, 음악실에는 아무도 없었습니다. 피아노 뚜껑은 열려 있었고, 방금 전까지 누군가가 앉아 있었던 듯한 의자 흔적이 있었다고 합니다.' },
  { id: 3, title: '장충동 목욕탕 살인사건', date: '2025-05-21', filter: 'true', level: 5, thumb: 'image/urban3.png', body: '엘리베이터에 홀로 타고 있는데, 누군가 버튼을 누른 것도 아닌데 갑자기 13층에 멈췄다. 문이 열리고 아무도 없었다...', detail: '엘리베이터를 타고 가던 중, 목적지와는 전혀 상관없는 13층에서 멈췄고, 문이 열렸지만 아무도 없었습니다. 괜히 오싹해서 바로 닫힘 버튼을 눌렀지만, 그 순간 누군가의 그림자가 문틈에 스쳤다고 합니다. 이후 그 빌딩에서 실제 사건이 벌어졌다는 이야기가 전해졌습니다.' },
  { id: 4, title: '졸음운전', date: '2025-05-19', filter: 'user', level: 1, thumb: 'image/urban4.png', body: '이 이야기는 실제로 내가 겪은 일이다...', detail: '고속도로에서 졸음운전을 하던 중, 잠시 의식을 잃었는데 꿈속에서 누군가가 "일어나!" 라고 소리쳤습니다. 그 순간 눈을 떠서 다행히 큰 사고는 피했지만, 다시 생각해도 그 목소리는 이승의 것이 아니었던 것 같다고 합니다.' }
];

function renderLevelStars(level) {
  return '★'.repeat(level) + '☆'.repeat(5 - level);
}

async function fetchLikesMap() {
  const snapshot = await getDocs(collection(db, 'urbanLikes'));
  const map = {};
  snapshot.forEach(doc => {
    map[doc.id] = doc.data().count || 0;
  });
  return map;
}

export async function renderUrbanList(sortType, filterType) {
  let list = [...urbanData];
  if (filterType && filterType !== 'all') {
    list = list.filter(item => item.filter === filterType);
  }

  const likesMap = await fetchLikesMap();

  if (sortType === 'latest') {
    list.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortType === 'popular') {
    list.sort((a, b) => (likesMap[b.id] || 0) - (likesMap[a.id] || 0));
  } else if (sortType === 'level') {
    list.sort((a, b) => b.level - a.level);
  }

  const urbanList = document.getElementById('urbanList');
  if (!urbanList) return;

  urbanList.innerHTML = list.map(item => `
    <div class="product-card urban-item" data-id="${item.id}" style="cursor:pointer;">
      <img src="${item.thumb}" alt="${item.title}">
      <div class="urban-item-title">${item.title}</div>
      <div class="urban-item-meta">
        <span>좋아요 ${likesMap[item.id] || 0}개</span>
        <span>${item.date}</span>
      </div>
      <div class="urban-item-level">공포 난이도: ${renderLevelStars(item.level)}</div>
    </div>
  `).join('');

  document.querySelectorAll('.urban-item').forEach(itemElem => {
    itemElem.addEventListener('click', function () {
      const id = this.getAttribute('data-id');
      window.history.pushState({}, '', `?id=${id}`);
      renderUrbanDetail(parseInt(id));
    });
  });
}

export async function renderUrbanDetail(id) {
  const data = urbanData.find(item => item.id === id);
  if (!data) return;

  const likeSnap = await getDoc(doc(db, 'urbanLikes', String(id)));
  const likeCount = likeSnap.exists() ? likeSnap.data().count : 0;

  const container = document.getElementById('urbanList');
  if (!container) return;

  container.innerHTML = `
    <div class="product-card urban-item urban-detail" style="width:100%;max-width:1200px;margin:0 auto; position: relative;">
      <div class="voice-mode" style="position:absolute; top:1rem; right:1rem;">
        <button id="playVoiceBtn" style="background:#444; color:#fff; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer;">
          🎧 음성 모드
        </button>
        <audio id="urbanVoiceAudio" style="display:none; margin-top:0.5rem; width:100%;">
          <source src="audio/urban${id}.mp3" type="audio/mpeg">
          브라우저가 오디오를 지원하지 않습니다.
        </audio>
      </div>

      <div class="urban-item-title">${data.title}</div>
      <div class="urban-item-meta">
        <span>${data.date}</span>
        <span>공포 난이도: ${renderLevelStars(data.level)}</span>
      </div>
      <div class="urban-item-body" style="margin-top:1.2rem; font-size:1.1rem; line-height:1.7;">${data.detail}</div>

      <div class="like-section" style="margin-top: 1rem;">
        <button id="likeBtn">❤️ 좋아요</button> <span id="likeCount">${likeCount}</span>
      </div>
    </div>
  `;

  const playBtn = document.getElementById('playVoiceBtn');
  const audioEl = document.getElementById('urbanVoiceAudio');
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

  updateVoiceState(voicePlaying);

  playBtn.addEventListener('click', () => {
    voicePlaying = !voicePlaying;
    updateVoiceState(voicePlaying);
  });
}
