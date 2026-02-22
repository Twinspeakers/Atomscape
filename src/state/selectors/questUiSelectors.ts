import type { AppState } from '@state/appStoreState'

export const selectTutorialChecklist = (state: AppState) => state.tutorialChecklist
export const selectTutorialCurrentStepIndex = (state: AppState) => state.tutorialCurrentStepIndex
export const selectTutorialComplete = (state: AppState) => state.tutorialComplete
export const selectTutorialEnabled = (state: AppState) => state.tutorialEnabled
export const selectTutorialCollapsed = (state: AppState) => state.tutorialCollapsed
export const selectInventory = (state: AppState) => state.inventory
export const selectEnergy = (state: AppState) => state.energy
export const selectCredits = (state: AppState) => state.credits
export const selectActiveSectorId = (state: AppState) => state.activeSectorId
export const selectWorldDestroyedCount = (state: AppState) => state.worldDestroyedCount
export const selectWorldRemainingCount = (state: AppState) => state.worldRemainingCount
export const selectWorldVisitedZoneIds = (state: AppState) => state.worldVisitedZoneIds
export const selectJumpToSector = (state: AppState) => state.jumpToSector
export const selectActiveMainQuestId = (state: AppState) => state.activeMainQuestId
export const selectResetTutorial = (state: AppState) => state.resetTutorial
export const selectDismissTutorial = (state: AppState) => state.dismissTutorial
export const selectPinnedQuestIds = (state: AppState) => state.pinnedQuestIds
export const selectQuestRewardHistory = (state: AppState) => state.questRewardHistory
export const selectToggleQuestPin = (state: AppState) => state.toggleQuestPin
export const selectSetActiveMainQuest = (state: AppState) => state.setActiveMainQuest
export const selectToggleTutorialCollapsed = (state: AppState) => state.toggleTutorialCollapsed
export const selectSetLabActiveTab = (state: AppState) => state.setLabActiveTab
