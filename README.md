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
