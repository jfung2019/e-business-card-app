const BACK_SECTION_LABEL = '--- BACK ---';

export function mergeCardOcrText(frontOcrText: string, backOcrText?: string): string {
  const front = frontOcrText.trim();
  const back = backOcrText?.trim() ?? '';

  if (!back) {
    return front;
  }
  if (!front) {
    return back;
  }

  return `${front}\n\n${BACK_SECTION_LABEL}\n\n${back}`;
}
