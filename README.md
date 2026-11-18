# 역카이브 미러

여까 방송 기록을 월간 달력, 주간, 요일별 썸네일과 연간 검색으로 살펴보는 정적 사이트입니다.

## 운영 구조

Google Sheets → GitHub Actions 수집 → `docs/data/` JSON 캐시 → GitHub Pages → 방문자

방문자의 달력 탐색과 새로고침은 구글시트를 호출하지 않습니다. 최근 두 개 등록 월은 30분마다, 전체 연도는 매일 03:23(한국 시간)에 수집합니다. Actions 예약 실행은 GitHub 상황에 따라 지연될 수 있습니다. 수집 실패 시 마지막 정상 캐시를 보존하며 `docs/data/manifest.json`에 오류를 남깁니다. 기록이 급격히 줄면 자동 덮어쓰기를 중단합니다. Google에 대한 동시 요청 없이 순차 수집합니다.

`config/sources.json`에서 원본 문서와 월별 gid를 관리합니다. 새 월·연도 추가 시 이 파일과 화면의 연도/월 선택 범위도 수정하세요. 원본 수정은 다음 수집 및 Pages 배포 후 반영됩니다. 즉시 수집하려면 Actions → Refresh archive cache and deploy Pages → Run workflow에서 all 또는 recent를 선택하세요.

## 개인 보관함

회원가입 없이 즐겨찾기, 링크를 클릭한 최근 시청 기록, 북마크 목록, 메모와 테마를 브라우저에 저장합니다. 개인 정보는 캐시나 GitHub로 전송하지 않습니다. 내 보관함의 백업 코드를 이용해 다른 브라우저·주소로 옮길 수 있습니다. 목록 공유 코드는 선택한 목록의 제목과 영상만 포함합니다. 전체 백업 코드는 시청 기록·메모도 포함하므로 본인 이전 용도로 보관하세요.

## 실행과 검증

Node.js 22 이상. 설치할 외부 패키지가 없습니다.

```sh
node scripts/sync-cache.mjs --all     # 원본 전체 수집
node scripts/sync-cache.mjs --recent  # 최근 등록 두 달 수집
node scripts/build-pages.mjs         # docs/index.html 생성
node scripts/test-cache.mjs
node scripts/test-library.mjs
python3 -m http.server 4174 --directory docs
```

GitHub Pages 설정은 Source를 GitHub Actions로 선택합니다. main 변경과 예약 수집 이후 자동 배포됩니다. 자동 실행 커밋은 마지막 정상 데이터를 저장하므로 장애가 나도 기존 캐시를 유지할 수 있습니다. 공개 저장소의 예약 실행은 장기간 활동이 없으면 GitHub에서 중지할 수 있으니 Actions에서 상태를 확인하세요.

`worker/`와 `.openai/`는 기존 Sites 호스팅용입니다. 이 서버 역시 Pages 캐시를 읽고, 접근 실패 시 번들에 보관된 캐시를 제공합니다. Pages에는 `docs/`만 배포합니다.

### 새 월 탭 자동 등록

예약 워크플로는 캐시 갱신 여부를 판단하기 전에 가장 최근 등록 연도의 원본 시트에서 월 탭을 확인합니다. `26년11월`, `2026년12월`, `12월`처럼 월을 식별할 수 있는 탭을 자동으로 등록합니다. 안내·게임 목록 등의 다른 탭은 제외합니다. 새 월을 읽고 검증한 뒤 `config/sources.json`, 월별 JSON, `catalog.json` 및 정적 사이트를 함께 저장·배포합니다. 잘못된 탭 이름, 같은 월의 중복 탭, 조회 실패 시 기존 등록과 캐시를 유지합니다.

월 선택과 초기 화면은 공용 `catalog.json`의 최신 월을 사용합니다. 열어 둔 페이지도 새로고침 또는 기존 5분 갱신 시 새 월 목록을 확인합니다. 방문자는 Google Sheets를 직접 조회하지 않습니다. 같은 파일의 12월 탭은 코드 수정 없이 추가되며, 다음 연도의 **새 스프레드시트 파일**은 해당 원본 URL을 별도로 등록해야 합니다. GitHub 예약 실행은 지연될 수 있습니다.

### 합방 멤버 검색

기존 검색창에서 제목 또는 합방 멤버 이름을 검색할 수 있습니다. 다른 달의 영상을 찾으려면 연간 모아보기를 선택하세요. 라디오를 포함해 멤버가 확인된 영상의 이름은 날짜 상세에서만 표시합니다.

`worker/index.js`의 `verifiedGuests`에 원본 영상 설명에서 확인한 이름만 영상 ID별로 등록합니다. 영상 설명 원문, 멤버 채널 링크, 확인되지 않은 이름은 저장하지 않습니다. 월 캐시 갱신과 별도로 관리하며 YouTube를 자동 조회하지 않습니다.

미확인 영상은 `python scripts/review-guests.py --limit 100`으로 최신 방송일부터 CSV로 뽑을 수 있습니다. 채널 운영자가 제공한 자료를 사용할 때는 `videoId,description` 열 또는 확인된 이름을 `|`로 구분한 `videoId,members` 열을 준비합니다.

- `python scripts/review-guests.py --input FILE.csv`: 등록 후보, 이름 없음, 검토 필요를 출력합니다.
- `python scripts/review-guests.py --input FILE.csv --apply`: 결과를 확인한 뒤 등록합니다. 애매한 설명은 제외하고 기존 이름 목록은 유지합니다.
- `npm run build:pages && npm test`: 검색용 페이지를 다시 빌드하고 검사합니다.

설명 원본 CSV는 저장소에 올리지 않습니다. 공개 페이지에는 이름만 포함되고, 멤버 목록이 없었던 영상의 검토 이력은 `config/guest-reviewed-empty.json`의 영상 ID만 저장합니다.

### YouTube API로 미확인 영상 설명 검토

구글시트를 준비할 필요 없이, 기존 달력에서 아직 확인하지 않은 영상 ID를 최신순으로 사용합니다.

1. [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)에서 **YouTube Data API v3**를 사용 설정합니다. **사용자 인증 정보**에서 API 키를 만들고, API 제한을 **YouTube Data API v3**로 설정합니다.
2. 저장소에서 `python scripts/review-youtube-api.py --dry-run --limit 10`으로 검토할 영상을 확인합니다.
3. `python scripts/review-youtube-api.py --limit 10`을 실행하고 화면에 표시되지 않는 입력창에 키를 넣습니다. 자동 실행 환경에서는 `YOUTUBE_API_KEY` 환경변수로 전달할 수 있습니다. 키를 소스, 명령 인자, 채팅, 공개 저장소에 넣지 않습니다.
4. 결과에 나타난 원본 설명으로 참여자를 검토합니다. `unavailable`은 설명을 확인할 수 없는 영상이며, 참여자가 없는 영상으로 처리하지 않습니다.

이 명령은 설명을 확인하기 위한 로컬 도구입니다. API 응답은 화면에만 출력하며, 키·설명 원문을 저장하거나 사이트에 배포하지 않습니다. 결과는 공개 로그나 GitHub에 붙여넣지 않습니다. API와 무관하게 확인하여 공개할 수 있는 참여자 목록은 기존 가져오기 절차로 등록합니다.

GitHub 캐시 갱신 때도 API를 호출하려면 저장소 **Settings → Secrets and variables → Actions**에 `YOUTUBE_API_KEY`를 등록합니다. 갱신 작업이 실행될 때 미확인 영상을 최신순으로 50편씩 묶어 조회합니다. 할당량·호출 제한을 포함한 API 오류 또는 4분 작업 시간에 도달하면 멈추고, 다음 갱신은 마지막으로 완료한 묶음 이후부터 이어집니다. 성공적으로 요청한 영상의 기존 아카이브 ID만 `config/youtube-api-progress.json`에 기록합니다. 조회할 수 없는 설명도 이미 정상적으로 요청한 영상이므로 반복 요청하지 않습니다. API 키, 영상 설명 원문, 영상별 응답 상태는 저장하거나 공개하지 않습니다. 공개 멤버 목록은 별도로 확인한 데이터만 사용합니다.
