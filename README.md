# 자기장 속 전류가 받는 힘 — 시뮬레이션 실험

말굽자석 사이에 있는 도선에 전류를 흘려서, 도선이 받는 **힘의 방향**과 **크기**를 알아보는 실험 웹앱입니다.
태블릿 PC에 맞춘 2단 화면이며, 세로로 들면 위·아래 2단으로 바뀝니다.

## 할 수 있는 것
- **전류의 방향**: 도선 양 끝의 (+), (−)를 바꿉니다. 전류는 (+) 끝에서 (−) 끝으로 흐릅니다.
- **전류의 세기**: 0 ~ 5 — 전류가 셀수록 힘이 커지고 도선이 더 많이 움직입니다.
- **자석의 극**: N극 오른쪽 / N극 왼쪽 — 자기장(여러 개의 초록 화살표)은 N극에서 S극을 향합니다.
- **오른손 겹쳐 보기**: 버튼을 누르면 오른손이 도선 위에 겹쳐 나타납니다.
  - 엄지 → 전류, 네 손가락 → 자기장, 손바닥이 향하는 쪽 → 힘
  - 힘이 아래쪽이면 손이 뒤집혀 손등이 보입니다.
- 오른쪽 아래 버튼으로 전류·자기장·힘 화살표를 하나씩 숨길 수 있습니다.

## 물리 계산
힘은 F = I L × B(벡터곱)로 계산합니다. 오른손도 같은 계산으로 돌려서 그리므로
실험 장면의 힘의 방향과 오른손의 손바닥 방향은 항상 같습니다.

## 파일 구성
```
index.html          화면 구조
style.css           디자인
app.js              실험 동작(계산·그리기·버튼)
.nojekyll           GitHub Pages 설정용 빈 파일
images/
  magnet_sn.png     말굽자석 (왼쪽 S, 오른쪽 N)
  magnet_ns.png     말굽자석 (왼쪽 N, 오른쪽 S)
```
> `images` 폴더 이름과 위치가 바뀌면 자석 그림이 나오지 않습니다. 폴더째로 올려 주세요.

## GitHub Pages에 올리는 방법
1. github.com에 로그인 → 오른쪽 위 **+** → **New repository**
2. Repository name에 영어로 이름 입력 (예: `magnet-force`) → **Public** 선택 → **Create repository**
3. 새 저장소 화면에서 **uploading an existing file** 클릭 (또는 **Add file → Upload files**)
4. 압축을 푼 `magnet-force` 폴더 **안의 내용물**(index.html, style.css, app.js, README.md, images 폴더)을 한꺼번에 끌어다 놓기
5. 아래쪽 **Commit changes** 클릭
6. 저장소 위쪽 **Settings** → 왼쪽 메뉴 **Pages**
7. **Source**: `Deploy from a branch`, **Branch**: `main` / `/(root)` → **Save**
8. 1~3분 뒤 새로고침하면 주소가 나타납니다: `https://<내 아이디>.github.io/magnet-force/`

### 이미 올린 저장소를 고칠 때
1. 저장소에서 예전 파일(`images/power.png`, `images/hand.png`, `images/hand_back.png`)은 더 이상 쓰지 않으니 지워도 됩니다.
   (파일 클릭 → 오른쪽 위 `…` → **Delete file** → **Commit changes**)
2. **Add file → Upload files**로 새 파일들을 올리면 같은 이름의 파일은 덮어써집니다 → **Commit changes**
3. 1~3분 뒤 태블릿에서 새로고침하세요.
