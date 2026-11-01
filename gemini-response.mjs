// streamGenerateContent returns a JSON array when alt=sse is not requested.
// Usage metadata is cumulative: retain the final report instead of summing it.
export function mergeGeminiResponse(payload) {
  const chunks=Array.isArray(payload)?payload:[payload];
  const parts=[];let usageMetadata,finishReason;
  for(const chunk of chunks) {
    if(chunk?.error)throw new Error('Google returned an error inside the generation stream.');
    const candidate=chunk?.candidates?.find(c=>(c.index??0)===0);
    if(candidate?.content?.parts)parts.push(...candidate.content.parts);
    if(candidate?.finishReason)finishReason=candidate.finishReason;
    if(chunk?.usageMetadata)usageMetadata=chunk.usageMetadata;
  }
  return {candidates:[{content:{parts},finishReason}],usageMetadata};
}
export function thinkingOptions(model) {
  if(/^gemini-3\.(1|5)-flash-lite$/.test(model))return {thinkingConfig:{thinkingLevel:'MINIMAL'}};
  if(/^gemini-[34]/.test(model))return {thinkingConfig:{thinkingLevel:'LOW'}};
  return {};
}
