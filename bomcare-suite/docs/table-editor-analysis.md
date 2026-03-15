# Table Editor Analysis

## 비교 기준

표 편집 기능은 아래 공식 문서 패턴을 기준으로 정리했다.

- CKEditor 5 Table
  - 행/열 추가 삭제
  - 셀 병합/분할
  - table properties / cell properties
- TinyMCE Tables
  - 헤더 행/열
  - 캡션
  - 셀/행/열 컨텍스트 메뉴
- Tiptap Table
  - addRow / addColumn / mergeCells / splitCell 같은 구조적 명령

## 이번 단계에 반영한 항목

- 셀 클릭 시 선택 표시
- 우클릭 컨텍스트 메뉴
- 행/열 추가와 삭제
- 오른쪽 셀 병합
- 셀 분할
- 헤더 행/열/셀 전환
- 표 캡션 토글
- 셀 정렬
- 셀 배경색
- 표 너비 60/80/100%

## 아직 남은 항목

- 아래 방향 병합
- rowspan / colspan을 모두 고려한 정교한 분할
- 셀 너비 직접 드래그
- 테두리/패딩/세로정렬 상세 속성
- 다중 셀 선택

## 참고 링크

- https://ckeditor.com/docs/ckeditor5/latest/features/tables/tables.html
- https://www.tiny.cloud/docs/tinymce/latest/table/
- https://tiptap.dev/docs/editor/extensions/nodes/table
