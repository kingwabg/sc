package com.bomcare.api.dashboard.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bomcare.api.dashboard.dto.DashboardSummaryResponse;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> summary() {
        return ResponseEntity.ok(new DashboardSummaryResponse(
                List.of(
                        new DashboardSummaryResponse.KpiCard("입소 아동", "38", "+2 this month", "calm"),
                        new DashboardSummaryResponse.KpiCard("긴급 조치", "3", "needs review", "alert"),
                        new DashboardSummaryResponse.KpiCard("오늘 상담", "12", "full schedule", "focus"),
                        new DashboardSummaryResponse.KpiCard("미제출 보고", "5", "document backlog", "warn")
                ),
                List.of(
                        new DashboardSummaryResponse.AttentionItem("약 복용 기록 확인 필요", "2명 기록이 오늘 비었습니다.", "HIGH"),
                        new DashboardSummaryResponse.AttentionItem("생활실 A 야간근무 교대", "23:00 전 인수인계 체크 필요", "MEDIUM")
                ),
                List.of(
                        new DashboardSummaryResponse.DocumentQueueItem("월간 운영 보고서", "HWP draft", "오늘 18:00"),
                        new DashboardSummaryResponse.DocumentQueueItem("급식비 정산표", "Spreadsheet review", "내일 10:00"),
                        new DashboardSummaryResponse.DocumentQueueItem("사례회의 요약", "Waiting approval", "내일 15:00")
                )
        ));
    }
}
