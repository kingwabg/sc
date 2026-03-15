package com.bomcare.api.document.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.bomcare.api.document.dto.JournalHwpRequest;

class JournalDocumentServiceTest {

    @Test
    void createsHwpBytes() {
        JournalDocumentService service = new JournalDocumentService();

        JournalHwpRequest request = new JournalHwpRequest(
                "운영일지(아동)",
                "최하은",
                "새봄 아동센터",
                "2026-03-16",
                "09:00",
                "18:00",
                "기초 생활 지원",
                List.of("입소 아동 상태 확인", "생활지도 진행"),
                List.of(
                        new JournalHwpRequest.JournalSection("진행 개요", "센터 운영 준비와 아동 입소 확인을 진행했습니다."),
                        new JournalHwpRequest.JournalSection("특이 사항", "건강 이상 징후는 없었고 보호자 연락 사항을 정리했습니다.")
                ),
                List.of("시간", "구분", "내용", "담당자"),
                List.of(
                        List.of("09:00 ~ 10:00", "준비", "교실 점검 및 환경 정리", "최하은"),
                        List.of("10:00 ~ 12:00", "프로그램", "기초 생활 지원 활동 진행", "최하은")
                ),
                "테스트 생성 문서"
        );

        byte[] result = service.createJournalDocument(request);

        assertTrue(result.length > 0);
    }
}
