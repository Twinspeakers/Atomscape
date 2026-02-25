import { describe, expect, it } from 'vitest'
import { DEFAULT_START_SECTOR_ID } from '@domain/spec/sectorSpec'
import { createMarketState } from '@features/simulation/engine'
import {
  buildStoreBootstrapContext,
  createEmptyInventory,
  DEFAULT_PLAYER_USERNAME,
  sanitizePlayerUsername,
} from './storeBootstrap'

describe('storeBootstrap', () => {
  it('creates an empty inventory with all known resources initialized to zero', () => {
    const inventory = createEmptyInventory()
    expect(Object.values(inventory).every((count) => count === 0)).toBe(true)
    expect(Object.keys(inventory).length).toBeGreaterThan(0)
  })

  it('sanitizes player usernames with fallback/trim/collapse/length limit', () => {
    expect(sanitizePlayerUsername(undefined)).toBe(DEFAULT_PLAYER_USERNAME)
    expect(sanitizePlayerUsername('   ')).toBe(DEFAULT_PLAYER_USERNAME)
    expect(sanitizePlayerUsername('  Captain    Nova  ')).toBe('Captain Nova')
    expect(sanitizePlayerUsername('x'.repeat(80))).toHaveLength(40)
  })

  it('builds bootstrap context from runtime/ui snapshots', () => {
    const context = buildStoreBootstrapContext({
      questRewardHistoryLimit: 32,
      dependencies: {
        nowMs: () => 1_700_000_000_000,
        createMarketState: () => createMarketState(),
        loadUiPreferences: () => ({
          leftPanels: ['tutorial'],
          rightPanels: ['inventory', 'hud'],
          pinnedQuestIds: ['main-foo'],
          activeMainQuestId: 'main-foo',
          uiDensity: 'compact',
          panelOpacity: 0.7,
        }),
        loadRuntimeSnapshot: () => ({
          activeSectorId: DEFAULT_START_SECTOR_ID,
          stationDistanceManual: 420,
          stationDistanceScene: 200,
          useSceneDistance: false,
          docked: false,
          charging: true,
          containmentOn: true,
          containmentPower: 65,
          cycleTimeSeconds: 123,
          energy: 333,
          maxEnergy: 2000,
          credits: 99,
          failureCount: 2,
          crewFeedsDelivered: 7,
          crewStatus: {
            hunger: 90,
            debuff: 2,
            starving: false,
            foodAutomationEnabled: true,
          },
          market: createMarketState(),
          claimedQuestRewardIds: [],
          questRewardHistory: [],
          labActiveTab: 'sorting',
        }),
      },
    })

    expect(context.initialStationDistance).toBe(420)
    expect(context.initialUseSceneDistance).toBe(false)
    expect(context.initialDocked).toBe(false)
    expect(context.initialCharging).toBe(true)
    expect(context.initialContainmentOn).toBe(true)
    expect(context.initialContainmentPower).toBe(65)
    expect(context.initialCycleTimeSeconds).toBe(123)
    expect(context.initialActiveSectorId).toBe(DEFAULT_START_SECTOR_ID)
    expect(context.initialWorldTargetCount).toBeGreaterThanOrEqual(0)
    expect(context.initialCrewMembers).toHaveLength(4)
    expect(context.initialCrewStatus.foodAutomationEnabled).toBe(true)
    expect(context.loadedUiPreferences.pinnedQuestIds).toEqual(['main-foo'])
    expect(context.loadedRuntimeSnapshot.energy).toBe(333)
  })
})
