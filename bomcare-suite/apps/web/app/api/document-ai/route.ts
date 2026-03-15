import { NextResponse } from "next/server";
import {
  DocumentAiContext,
  DocumentAiResponse,
  parseLocalDocumentCommand,
  sanitizeDocumentAiResponse
} from "../../../lib/document-ai";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "actions"],
  properties: {
    reply: {
      type: "string"
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: {
            type: "string",
            enum: [
              "create_table",
              "set_selected_cells",
              "add_row",
              "add_column",
              "delete_rows",
              "delete_columns",
              "merge_selected_cells",
              "split_selected_cell",
              "toggle_header",
              "set_alignment",
              "set_background",
              "remove_table"
            ]
          },
          rows: { type: "number" },
          columns: { type: "number" },
          caption: { type: "string" },
          headers: {
            type: "array",
            items: { type: "string" }
          },
          data: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" }
            }
          },
          values: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" }
            }
          },
          position: {
            type: "string",
            enum: ["above", "below", "left", "right"]
          },
          count: { type: "number" },
          scope: {
            type: "string",
            enum: ["row", "column", "cell"]
          },
          value: { type: "string" }
        }
      }
    }
  }
} as const;

function extractResponseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const textParts: string[] = [];

  output.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];

    content.forEach((part) => {
      if (!part || typeof part !== "object") return;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        textParts.push(text);
      }
    });
  });

  return textParts.join("\n").trim();
}

function buildFallback(prompt: string, context: DocumentAiContext): DocumentAiResponse {
  return parseLocalDocumentCommand(prompt, context);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    prompt?: string;
    context?: DocumentAiContext;
  };

  const prompt = body.prompt?.trim();
  const context = body.context;

  if (!prompt || !context) {
    return NextResponse.json({ error: "prompt and context are required" }, { status: 400 });
  }

  const fallback = buildFallback(prompt, context);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_DOCUMENT_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You convert Korean document editing requests into safe table-editing actions. Reply in Korean. Only use supported actions. If a table selection is required but missing, return an empty actions array and explain that the user should select a table or cells first."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({ prompt, context })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText = extractResponseText(payload);
    const parsed = sanitizeDocumentAiResponse(JSON.parse(outputText));

    if (!parsed) {
      throw new Error("Invalid AI response shape");
    }

    return NextResponse.json({
      ...parsed,
      mode: "openai"
    } satisfies DocumentAiResponse);
  } catch {
    return NextResponse.json(fallback);
  }
}
