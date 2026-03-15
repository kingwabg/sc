"use client";

type AiMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

type DocumentAiPanelProps = {
  open: boolean;
  busy: boolean;
  modeLabel: string;
  input: string;
  messages: AiMessage[];
  quickPrompts: readonly string[];
  contextLabel: string;
  onInputChange: (value: string) => void;
  onPromptSelect: (value: string) => void;
  onSubmit: () => void;
  onToggle: () => void;
};

export function DocumentAiPanel({
  open,
  busy,
  modeLabel,
  input,
  messages,
  quickPrompts,
  contextLabel,
  onInputChange,
  onPromptSelect,
  onSubmit,
  onToggle
}: DocumentAiPanelProps) {
  return (
    <aside className={`doc-ai-panel ${open ? "open" : "collapsed"}`}>
      <button type="button" className="doc-ai-fab" onClick={onToggle}>
        {open ? "AI 접기" : "AI 열기"}
      </button>

      {open ? (
        <div className="doc-ai-card">
          <div className="doc-ai-head">
            <div>
              <strong>문서 AI 편집</strong>
              <span>{contextLabel}</span>
            </div>
            <span className="doc-ai-mode">{modeLabel}</span>
          </div>

          <div className="doc-ai-chip-row">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="doc-ai-chip" onClick={() => onPromptSelect(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="doc-ai-thread">
            {messages.map((message) => (
              <article key={message.id} className={`doc-ai-bubble ${message.role}`}>
                <strong>{message.role === "assistant" ? "AI" : "사용자"}</strong>
                <p>{message.content}</p>
              </article>
            ))}
            {busy ? <div className="doc-ai-loading">AI가 표 명령을 정리하는 중입니다...</div> : null}
          </div>

          <div className="doc-ai-composer">
            <textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="예: 선택한 표 첫 줄을 헤더로 바꾸고 오른쪽에 열 하나 추가해줘"
              rows={4}
            />
            <button type="button" className="primary-action" onClick={onSubmit} disabled={busy}>
              {busy ? "실행 중..." : "AI로 수정"}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
