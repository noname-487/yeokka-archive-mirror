# 보안 점검 및 보완

점검 대상: yam.yeokka.com 정적 GitHub Pages, 기존 Sites Worker, 캐시 수집 및 배포 작업. 점검일: 2026-10-23 (한국 시간).

## 확인된 사항과 변경

- 캐시를 렌더링하기 전에 영상 ID·날짜·제목 길이·분류·월별 건수를 검증하지 않던 경로를 보완했습니다. 영상 링크는 검증한 YouTube ID로 재생성하며 원본 링크는 등록된 Google Sheets 문서에 한정합니다. 이는 캐시 변조에 대한 추가 방어입니다. 정상 원본 시트 파서에는 이미 영상 ID 검증과 제목 이스케이프가 적용되어 있었습니다.
- Content Security Policy가 없었습니다. 생성한 HTML의 스크립트와 스타일 SHA-256 해시만 허용하고 인라인 이벤트 속성, 임의 외부 스크립트, eval, 폼 제출, base 태그 변경을 차단합니다. 캐시 통신은 같은 출처, 이미지는 YouTube 썸네일 서버만 허용합니다. 이미지 오류 처리는 HTML 이벤트 속성에서 이벤트 리스너로 옮겼습니다.
- 외부 링크에 noreferrer, 문서에 no-referrer를 적용했습니다. 브라우저 저장 데이터가 외부 링크의 Referer로 전달되지 않도록 방어를 강화했습니다. 원래 저장 데이터는 URL에 포함하지 않았습니다.
- JSON 응답은 스트림으로 최대 1 MiB, Google 원본 HTML은 최대 4 MiB로 제한합니다. 기존 공유 코드의 압축 해제 후 2 MiB 제한도 악성 압축 데이터로 재검증했습니다.
- 기존 Worker의 새로고침 매개변수로 서버 캐시를 우회할 수 있던 경로를 제거했습니다. 같은 월의 동시 요청은 하나로 합칩니다.
- GitHub Actions의 가변 버전 태그를 공식 저장소에서 확인한 커밋 SHA로 고정하고 기본 권한을 비웠습니다. 수집 작업에는 캐시 저장에 필요한 contents:write, 배포 작업에는 pages:write와 id-token:write만 부여합니다. 불필요한 configure-pages 액션을 제거하고 작업 시간도 제한했습니다.

## 유지되는 개인정보 처리

즐겨찾기·최근 링크 클릭·목록·메모는 브라우저에 저장하며 서버나 GitHub에 업로드하지 않습니다. 목록 공유 코드는 선택한 목록만 포함합니다. 전체 백업 코드는 암호화되지 않은 데이터이므로 받은 사람이 내용을 읽을 수 있습니다. 이 제한을 백업 내보내기 화면에도 표시합니다. 해시는 손상 확인용이며 작성자 인증 수단이 아닙니다.

## 검증 및 한계

캐시 속성 주입, javascript URL, 잘못된 날짜, 과도한 응답·압축 데이터, 메모의 프로토타입 키, 스크립트·스타일 CSP 해시, 제목 이스케이프, 반복 새로고침과 동시 요청을 자동 테스트합니다. 기존 즐겨찾기·공유·백업·저장 실패 복구 테스트를 함께 실행합니다.

정적 GitHub Pages에는 앱에서 임의 HTTP 보안 헤더를 설정할 수 없습니다. CSP는 HTML meta로 적용하며 frame-ancestors, X-Frame-Options, HSTS 및 Permissions-Policy는 해당 정적 배포에 추가하지 못했습니다. iframe 삽입 제한까지 필요한 경우 헤더를 설정할 수 있는 CDN/호스팅 계층이 필요합니다. 기존 Worker에는 CSP HTTP 헤더와 프레임 제한·Permissions-Policy·nosniff를 적용했습니다.

이 점검은 코드·설정 검토와 제한된 자동 테스트입니다. 제로데이, 사용자 브라우저 확장 프로그램, GitHub 계정 탈취 및 DNS 관리 계정의 보안까지 보증하지 않습니다. GitHub 계정과 도메인 관리 계정에는 다중 인증을 유지하세요. 계정·DNS 설정은 이번 작업에서 변경하지 않았습니다.

근거: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP 및 https://docs.github.com/en/actions/reference/security/secure-use
