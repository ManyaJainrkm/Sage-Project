/**
 * The browser build of mammoth ships without type declarations. We use only
 * extractRawText, so declare the minimal surface we depend on.
 */
declare module "mammoth/mammoth.browser.js" {
  interface ExtractResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  interface ExtractInput {
    arrayBuffer: ArrayBuffer;
  }
  export function extractRawText(input: ExtractInput): Promise<ExtractResult>;
}
