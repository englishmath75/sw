# 영수쌤의 Python 교실 · 짧은 공식 주소

학생용 메인: https://sw.englishmath.kr/

| 화면 | 새 주소 |
| --- | --- |
| 수업 안내 | `/` |
| 차시별 실습 | `/step-by-step.html?lesson=1` |
| 전체체험 | `/first-analysis.html` |
| Python 핵심 복습 | `/python-review.html` |
| 질문 보충실 · 8비트·색상 | `/questions-supplement.html` |
| 리스트·튜플·딕셔너리 비교 실습 | `/list-tuple-dictionary.html` |
| 수학 함수 그래프 그리기 | `/math-function-graphs.html` |
| 화면 좌표계·물리 원리 | `/physics-explanation.html` |
| 그래픽 작품 체험실 | `/graphics-gallery.html` |
| 실습 자료·복습 문제·보고서 | `/?page=data`, `?page=exam`, `?page=report` |
| 아두이노·피코 기존 교실 | `/pico.html` |

수업 소스와 Git 이력의 기준은 기존 `englishmath75/pico-lab-classroom` 저장소입니다.
이 저장소는 원본의 특정 커밋을 가져와 기존 Vite 앱을 빌드하고, 판다스 교실을 루트로 옮겨 GitHub Pages에 게시합니다.
원본 코드를 이 저장소에 복제해 따로 관리하지 않습니다. 영상·실습·다운로드 자료를 모두 같은 배포에 포함합니다.

새 배포 구성의 push, 수동 실행, 15분 간격 변경 확인으로 배포합니다. 예약 실행은 GitHub 사정에 따라 늦어질 수 있습니다.
`site-version.json`에서 실제 게시된 원본 커밋을 확인할 수 있습니다. 변경이 없으면 빌드는 생략합니다.

기존 `/pandas-data-lab/` HTML 경로는 호환 이동 페이지로 남깁니다. 쿼리와 앵커를 보존합니다.
기존 GitHub Pages 주소는 GitHub의 사용자 지정 도메인 리디렉션을 통해 새 주소로 연결됩니다. 새 도메인은 별도 출처이므로 기존 브라우저의 localStorage 학습 기록은 자동 이전되지 않습니다. 키 형식은 유지합니다.
학생 학습 기록을 삭제하거나 다른 서버로 보내지 않습니다.

수정 시 `scripts/package_site.py`의 경로 변환과 `scripts/check_site.py`를 실행해 내부 링크·영상 파일을 확인합니다.

## 보충 교재 업데이트 원칙

기존 정규 수업 본문을 덮어쓰지 않고, 학생의 새로운 질문과 이해를 돕는 서술형 설명을 `/questions-supplement.html`에 누적합니다. 원본 수업 소스 `englishmath75/pico-lab-classroom`을 갱신하면 이 저장소의 게시 워크플로가 최신 내용을 배포합니다.
