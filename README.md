# 영수쌤의 Python 교실 · 짧은 공식 주소

학생용 메인: https://englishmath75.github.io/sw/

| 화면 | 새 주소 |
| --- | --- |
| 수업 안내 | `/sw/` |
| 차시별 실습 | `/sw/step-by-step.html?lesson=1` |
| 전체체험 | `/sw/first-analysis.html` |
| Python 핵심 복습 | `/sw/python-review.html` |
| 실습 자료·복습 문제·보고서 | `/sw/?page=data`, `?page=exam`, `?page=report` |
| 아두이노·피코 기존 교실 | `/sw/pico.html` |

수업 소스와 Git 이력의 기준은 기존 `englishmath75/pico-lab-classroom` 저장소입니다.
이 저장소는 원본의 특정 커밋을 가져와 기존 Vite 앱을 빌드하고, 판다스 교실을 루트로 옮겨 GitHub Pages에 게시합니다.
원본 코드를 이 저장소에 복제해 따로 관리하지 않습니다. 영상·실습·다운로드 자료를 모두 같은 배포에 포함합니다.

새 배포 구성의 push, 수동 실행, 15분 간격 변경 확인으로 배포합니다. 예약 실행은 GitHub 사정에 따라 늦어질 수 있습니다.
`site-version.json`에서 실제 게시된 원본 커밋을 확인할 수 있습니다. 변경이 없으면 빌드는 생략합니다.

기존 `/pandas-data-lab/` HTML 경로는 호환 이동 페이지로 남깁니다. 쿼리와 앵커를 보존합니다.
기존과 새 사이트는 모두 `https://englishmath75.github.io` 출처를 쓰므로 localStorage 키를 변경하지 않습니다.
학생 학습 기록을 삭제하거나 다른 서버로 보내지 않습니다.

수정 시 `scripts/package_site.py`의 경로 변환과 `scripts/check_site.py`를 실행해 내부 링크·영상 파일을 확인합니다.
