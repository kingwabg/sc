package com.bomcare.api.document.service;

import java.io.ByteArrayOutputStream;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.bomcare.api.document.dto.JournalHwpRequest;

import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.object.bodytext.Section;
import kr.dogfoot.hwplib.object.bodytext.control.ControlTable;
import kr.dogfoot.hwplib.object.bodytext.control.ControlType;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.HeightCriterion;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.HorzRelTo;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.ObjectNumberSort;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.RelativeArrange;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.TextFlowMethod;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.TextHorzArrange;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.VertRelTo;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.gso.WidthCriterion;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.CtrlHeaderGso;
import kr.dogfoot.hwplib.object.bodytext.control.table.Cell;
import kr.dogfoot.hwplib.object.bodytext.control.table.DivideAtPageBoundary;
import kr.dogfoot.hwplib.object.bodytext.control.table.ListHeaderForCell;
import kr.dogfoot.hwplib.object.bodytext.control.table.Row;
import kr.dogfoot.hwplib.object.bodytext.control.table.Table;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.object.bodytext.paragraph.charshape.ParaCharShape;
import kr.dogfoot.hwplib.object.bodytext.paragraph.header.ParaHeader;
import kr.dogfoot.hwplib.object.bodytext.paragraph.lineseg.LineSegItem;
import kr.dogfoot.hwplib.object.bodytext.paragraph.lineseg.ParaLineSeg;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.ParaText;
import kr.dogfoot.hwplib.object.docinfo.BorderFill;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BackSlashDiagonalShape;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderThickness;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderType;
import kr.dogfoot.hwplib.object.docinfo.borderfill.SlashDiagonalShape;
import kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.PatternFill;
import kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.PatternType;
import kr.dogfoot.hwplib.tool.blankfilemaker.BlankFileMaker;
import kr.dogfoot.hwplib.writer.HWPWriter;

@Service
public class JournalDocumentService {
    private static final double TABLE_WIDTH_MM = 170.0;
    private static final double TABLE_ROW_HEIGHT_MM = 11.0;

    public byte[] createJournalDocument(JournalHwpRequest request) {
        try {
            HWPFile hwpFile = BlankFileMaker.make();
            Section section = hwpFile.getBodyText().getSectionList().get(0);

            addParagraph(section, request.title(), (short) 2, 10);
            addParagraph(section, buildMetaLine(request), (short) 1, 11);

            if (!request.highlights().isEmpty()) {
                addParagraph(section, "핵심 메모: " + String.join(" / ", request.highlights()), (short) 1, 11);
            }

            for (JournalHwpRequest.JournalSection item : request.sections()) {
                addParagraph(section, item.heading(), (short) 2, 10);
                addParagraph(section, item.content(), (short) 1, 11);
            }

            if (StringUtils.hasText(request.notes())) {
                addParagraph(section, "비고: " + request.notes().trim(), (short) 1, 11);
            }

            appendJournalTable(hwpFile, section, request.tableHeaders(), request.tableRows());

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            HWPWriter.toStream(hwpFile, outputStream);
            return outputStream.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("운영일지 HWP 생성에 실패했습니다.", exception);
        }
    }

    private String buildMetaLine(JournalHwpRequest request) {
        List<String> values = new ArrayList<>();
        values.add("시설: " + request.facilityName());
        values.add("일자: " + request.journalDate());

        String timeRange = buildTimeRange(request.startTime(), request.endTime());
        if (StringUtils.hasText(timeRange)) {
            values.add("운영시간: " + timeRange);
        }

        if (StringUtils.hasText(request.programName())) {
            values.add("프로그램: " + request.programName().trim());
        }

        values.add("담당자: " + request.author());
        return String.join(" | ", values);
    }

    private String buildTimeRange(String startTime, String endTime) {
        if (StringUtils.hasText(startTime) && StringUtils.hasText(endTime)) {
            return startTime.trim() + " ~ " + endTime.trim();
        }
        if (StringUtils.hasText(startTime)) {
            return startTime.trim();
        }
        if (StringUtils.hasText(endTime)) {
            return endTime.trim();
        }
        return "";
    }

    private Paragraph addParagraph(Section section, String text, short styleId, int paraShapeId) {
        Paragraph paragraph = section.addNewParagraph();
        initializeParagraph(paragraph, text, styleId, paraShapeId);
        return paragraph;
    }

    private void initializeParagraph(Paragraph paragraph, String text, short styleId, int paraShapeId) {
        ParaHeader header = paragraph.getHeader();
        header.setLastInList(true);
        header.setParaShapeId(paraShapeId);
        header.setStyleId(styleId);
        header.getDivideSort().setDivideSection(false);
        header.getDivideSort().setDivideMultiColumn(false);
        header.getDivideSort().setDividePage(false);
        header.getDivideSort().setDivideColumn(false);
        header.setCharShapeCount(1);
        header.setRangeTagCount(0);
        header.setLineAlignCount(1);
        header.setInstanceID(0);
        header.setIsMergedByTrack(0);

        paragraph.createText();
        addText(paragraph.getText(), StringUtils.hasText(text) ? text : " ");
        header.setCharacterCount(paragraph.getText().getCharList().size());

        paragraph.createCharShape();
        ParaCharShape paraCharShape = paragraph.getCharShape();
        paraCharShape.addParaCharShape(0, 0);

        paragraph.createLineSeg();
        ParaLineSeg lineSeg = paragraph.getLineSeg();
        LineSegItem item = lineSeg.addNewLineSegItem();
        item.setTextStartPosition(0);
        item.setLineVerticalPosition(0);
        item.setLineHeight(ptToLineHeight(10.0));
        item.setTextPartHeight(ptToLineHeight(10.0));
        item.setDistanceBaseLineToLineVerticalPosition(ptToLineHeight(8.5));
        item.setLineSpace(ptToLineHeight(3.0));
        item.setStartPositionFromColumn(0);
        item.setSegmentWidth((int) mmToHwp(170.0));
        item.getTag().setFirstSegmentAtLine(true);
        item.getTag().setLastSegmentAtLine(true);
    }

    private void addText(ParaText paraText, String text) {
        try {
            paraText.addString(text);
        } catch (UnsupportedEncodingException exception) {
            throw new IllegalStateException("문단 텍스트를 추가하지 못했습니다.", exception);
        }
    }

    private void appendJournalTable(HWPFile hwpFile, Section section, List<String> headers, List<List<String>> rows) {
        List<String> normalizedHeaders = headers == null || headers.isEmpty()
                ? List.of("시간", "구분", "내용", "담당자")
                : headers;

        List<List<String>> normalizedRows = rows == null || rows.isEmpty()
                ? List.of(
                        List.of(buildTimeRange("", ""), "운영 메모", "AI 또는 담당자가 작성한 내용을 입력합니다.", section.getParagraphCount() > 0 ? "담당자" : "")
                )
                : rows;

        Paragraph anchor = addParagraph(section, "운영 내용 표", (short) 1, 11);
        anchor.getText().addExtendCharForTable();
        anchor.getHeader().setCharacterCount(anchor.getText().getCharList().size());

        ControlTable tableControl = (ControlTable) anchor.addNewControl(ControlType.Table);
        configureTableHeader(tableControl, normalizedHeaders.size(), normalizedRows.size() + 1);

        int bodyBorderFillId = createCellBorderFill(hwpFile, false);
        int headerBorderFillId = createCellBorderFill(hwpFile, true);

        Table table = tableControl.getTable();
        table.setRowCount(normalizedRows.size() + 1);
        table.setColumnCount(normalizedHeaders.size());
        table.setCellSpacing(0);
        table.setLeftInnerMargin(80);
        table.setRightInnerMargin(80);
        table.setTopInnerMargin(40);
        table.setBottomInnerMargin(40);
        table.setBorderFillId(bodyBorderFillId);

        for (int rowIndex = 0; rowIndex < normalizedRows.size() + 1; rowIndex++) {
            table.getCellCountOfRowList().add(normalizedHeaders.size());
        }

        Row headerRow = tableControl.addNewRow();
        for (int columnIndex = 0; columnIndex < normalizedHeaders.size(); columnIndex++) {
            Cell cell = headerRow.addNewCell();
            setCellHeader(cell.getListHeader(), columnIndex, 0, normalizedHeaders.size(), headerBorderFillId);
            initializeParagraph(cell.getParagraphList().addNewParagraph(), normalizedHeaders.get(columnIndex), (short) 1, 11);
        }

        for (int rowIndex = 0; rowIndex < normalizedRows.size(); rowIndex++) {
            Row row = tableControl.addNewRow();
            List<String> rowValues = normalizedRows.get(rowIndex);

            for (int columnIndex = 0; columnIndex < normalizedHeaders.size(); columnIndex++) {
                Cell cell = row.addNewCell();
                setCellHeader(cell.getListHeader(), columnIndex, rowIndex + 1, normalizedHeaders.size(), bodyBorderFillId);
                String value = columnIndex < rowValues.size() ? rowValues.get(columnIndex) : "";
                initializeParagraph(cell.getParagraphList().addNewParagraph(), StringUtils.hasText(value) ? value : "-", (short) 1, 11);
            }
        }
    }

    private void configureTableHeader(ControlTable tableControl, int columnCount, int rowCount) {
        CtrlHeaderGso header = tableControl.getHeader();
        header.getProperty().setLikeWord(false);
        header.getProperty().setApplyLineSpace(false);
        header.getProperty().setVertRelTo(VertRelTo.Para);
        header.getProperty().setVertRelativeArrange(RelativeArrange.TopOrLeft);
        header.getProperty().setHorzRelTo(HorzRelTo.Para);
        header.getProperty().setHorzRelativeArrange(RelativeArrange.TopOrLeft);
        header.getProperty().setVertRelToParaLimit(false);
        header.getProperty().setAllowOverlap(false);
        header.getProperty().setWidthCriterion(WidthCriterion.Absolute);
        header.getProperty().setHeightCriterion(HeightCriterion.Absolute);
        header.getProperty().setProtectSize(false);
        header.getProperty().setTextFlowMethod(TextFlowMethod.FitWithText);
        header.getProperty().setTextHorzArrange(TextHorzArrange.BothSides);
        header.getProperty().setObjectNumberSort(ObjectNumberSort.Table);
        header.setxOffset(0);
        header.setyOffset(0);
        header.setWidth(mmToHwp(TABLE_WIDTH_MM));
        header.setHeight(mmToHwp(Math.max(24.0, rowCount * TABLE_ROW_HEIGHT_MM)));
        header.setzOrder(0);
        header.setOutterMarginLeft(0);
        header.setOutterMarginRight(0);
        header.setOutterMarginTop(0);
        header.setOutterMarginBottom(0);

        Table table = tableControl.getTable();
        table.getProperty().setDivideAtPageBoundary(DivideAtPageBoundary.DivideByCell);
        table.getProperty().setAutoRepeatTitleRow(true);
        table.setRowCount(rowCount);
        table.setColumnCount(columnCount);
    }

    private void setCellHeader(ListHeaderForCell header, int columnIndex, int rowIndex, int columnCount, int borderFillId) {
        double cellWidthMm = TABLE_WIDTH_MM / columnCount;
        header.setParaCount(1);
        header.getProperty().setProtectCell(false);
        header.getProperty().setEditableAtFormMode(false);
        header.setColIndex(columnIndex);
        header.setRowIndex(rowIndex);
        header.setColSpan(1);
        header.setRowSpan(1);
        header.setWidth(mmToHwp(cellWidthMm));
        header.setHeight(mmToHwp(TABLE_ROW_HEIGHT_MM));
        header.setLeftMargin(120);
        header.setRightMargin(120);
        header.setTopMargin(60);
        header.setBottomMargin(60);
        header.setBorderFillId(borderFillId);
        header.setTextWidth(mmToHwp(cellWidthMm));
        header.setFieldName("");
    }

    private int createCellBorderFill(HWPFile hwpFile, boolean headerCell) {
        BorderFill borderFill = hwpFile.getDocInfo().addNewBorderFill();
        borderFill.getProperty().set3DEffect(false);
        borderFill.getProperty().setShadowEffect(false);
        borderFill.getProperty().setSlashDiagonalShape(SlashDiagonalShape.None);
        borderFill.getProperty().setBackSlashDiagonalShape(BackSlashDiagonalShape.None);
        borderFill.getLeftBorder().setType(BorderType.Solid);
        borderFill.getLeftBorder().setThickness(BorderThickness.MM0_5);
        borderFill.getLeftBorder().getColor().setValue(0x444444);
        borderFill.getRightBorder().setType(BorderType.Solid);
        borderFill.getRightBorder().setThickness(BorderThickness.MM0_5);
        borderFill.getRightBorder().getColor().setValue(0x444444);
        borderFill.getTopBorder().setType(BorderType.Solid);
        borderFill.getTopBorder().setThickness(BorderThickness.MM0_5);
        borderFill.getTopBorder().getColor().setValue(0x444444);
        borderFill.getBottomBorder().setType(BorderType.Solid);
        borderFill.getBottomBorder().setThickness(BorderThickness.MM0_5);
        borderFill.getBottomBorder().getColor().setValue(0x444444);
        borderFill.getDiagonalBorder().setType(BorderType.None);
        borderFill.getDiagonalBorder().setThickness(BorderThickness.MM0_5);
        borderFill.getDiagonalBorder().getColor().setValue(0x0);
        borderFill.getFillInfo().getType().setPatternFill(true);
        borderFill.getFillInfo().createPatternFill();
        PatternFill patternFill = borderFill.getFillInfo().getPatternFill();
        patternFill.setPatternType(PatternType.None);
        patternFill.getBackColor().setValue(headerCell ? 0xF1F1F1 : 0xFFFFFF);
        patternFill.getPatternColor().setValue(0);
        return hwpFile.getDocInfo().getBorderFillList().size();
    }

    private long mmToHwp(double mm) {
        return (long) (mm * 72000.0f / 254.0f + 0.5f);
    }

    private int ptToLineHeight(double pt) {
        return (int) (pt * 100.0f);
    }
}
