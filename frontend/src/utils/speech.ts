/**
 * Speaks a short piece of text with the browser's built-in speech engine.
 * Returns false when speech synthesis is unavailable so callers can show a fallback message.
 */
export function speakText(text: string, lang = 'en-US'): boolean {
  const normalizedText = text.trim()

  if (
    !normalizedText
    || typeof window === 'undefined'
    || !('speechSynthesis' in window)
    || typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return false
  }

  const utterance = new SpeechSynthesisUtterance(normalizedText)
  utterance.lang = lang
  utterance.rate = 0.92
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  return true
}
