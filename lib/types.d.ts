declare module 'pdf-parse' { function parse(dataBuffer: Buffer): Promise<{ text: string }>; export = parse; } declare module 'mammoth' { interface Result { value: string; messages: any[]; } function extractRawText(options: { buffer: Buffer }): Promise<Result>; export { extractRawText }; } declare module 'anthropic' { interface AnthropicOptions { apiKey: string; } interface MessageContent { type: string; text: string; } interface Message { role: 'user' | 'assistant'; content: string | MessageContent[]; } interface MessageResponse { id: string; content: MessageContent[]; role: string; model: string; stopReason: string; usage: { inputTokens: number; outputTokens: number; }; } interface MessagesOptions { model: string; max_tokens: number; temperature?: number; messages: Message[]; } class Messages { create(options: MessagesOptions): Promise<MessageResponse>; } export default class Anthropic { messages: Messages; constructor(options: AnthropicOptions); } }
