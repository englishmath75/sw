# SW V2 게시 준비 — 운영 미반영

기존 GitHub Pages 경로와 브랜드·자료 검사를 유지하고, 검증된 SW 소스 SHA를 release-source.json에 고정합니다. 예약 게시도 이 고정값을 사용합니다. 공유 Firebase 규칙 변경 승인이 없으면 게시 검사가 실패하도록 준비했습니다.

현재 규칙 승인은 false이며 main을 변경하지 않았습니다. source PR #40과 최신 SW CI 결과를 검토한 뒤 승인 기록·정확한 검증 SHA를 확정합니다. MK/외부 상용 서비스는 배포 대상이 아닙니다.

복구 기준: source c38e7ce5e057b68898d086dde1caaaceae4f6d00 + publisher 17162105ba32ac5075017115901800cb298068a0. 소스의 sw/ROLLBACK.md를 따릅니다.
