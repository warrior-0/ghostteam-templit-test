// server.js
const express    = require('express');
const bodyParser = require('body-parser');
const { Octokit }= require('@octokit/rest');
const path       = require('path');

const app = express();
app.use(bodyParser.json());

// → GitHub Personal Access Token은 절대 클라이언트에 노출 금지!
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// 리포지토리 설정
const OWNER  = 'YOUR_GITHUB_USERNAME';
const REPO   = 'YOUR_REPO_NAME';
const BRANCH = 'main';
const FILE_PATH = 'urban.js';  // 리포지토리 루트에 urban.js 가 있을 때

app.post('/api/like', async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10);
    if (isNaN(id)) throw new Error('유효한 id를 보내주세요.');

    // 1) 기존 파일(urban.js) 내용 + SHA 조회
    const { data: file } = await octokit.repos.getContent({
      owner: OWNER,
      repo:  REPO,
      path:  FILE_PATH,
      ref:   BRANCH
    });

    // 2) Base64 → UTF-8 디코딩
    const content = Buffer.from(file.content, 'base64').toString('utf8');

    // 3) 정규표현식으로 해당 id 블록의 likes 값만 +1
    const regex = new RegExp(
      `(\\{[\\s\\S]*?id:\\s*${id}\\s*,[\\s\\S]*?likes:\\s*)(\\d+)`
    );
    const newContent = content.replace(regex, (_, prefix, num) => {
      return prefix + (parseInt(num, 10) + 1);
    });

    // 4) UTF-8 → Base64 재인코딩
    const updatedBase64 = Buffer.from(newContent, 'utf8').toString('base64');

    // 5) 파일 업데이트 (커밋)
    await octokit.repos.createOrUpdateFileContents({
      owner:       OWNER,
      repo:        REPO,
      path:        FILE_PATH,
      message:     `chore: bump likes for urbanData id=${id}`,
      content:     updatedBase64,
      sha:         file.sha,
      branch:      BRANCH
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
