import { needsArabicCheck } from '../arabic/terminal.ts'

export type TerminalSetup = { id: string; manual: string | null | undefined; saved: Record<string, unknown> | undefined }
export const arabicSetupShowing = (surface: string, hasSurvey: boolean, terminal?: TerminalSetup): boolean =>
  surface === 'terminal' && !hasSurvey && !!terminal && needsArabicCheck(terminal.id, terminal.manual, terminal.saved)

// The same decision draws setup forms and withholds reminder bands. No engine handles.
export const setupForm = (input: {
  surface: string; hasSurvey: boolean; hasPlace: boolean; hasReview: boolean; later: boolean; terminal?: TerminalSetup
}): 'survey' | 'arabic' | 'review' | 'city' | null => {
  if (input.hasSurvey) return 'survey'
  if (arabicSetupShowing(input.surface, input.hasSurvey, input.terminal)) return 'arabic'
  if (input.hasPlace && input.hasReview) return 'review'
  if (!input.hasPlace && !input.later) return 'city'
  return null
}
