import {
  mainQuestDefinitions,
  sideQuestDefinitions,
  tutorialStepDescriptors,
} from '../../../src/features/quests/questDefinitions.js'
import { AUTO_GENERATED_HEADER, type GeneratedPage } from '../types.js'

export function buildQuestReferencePage(): GeneratedPage {
  const stepById = tutorialStepDescriptors.reduce<Record<string, (typeof tutorialStepDescriptors)[number]>>(
    (map, step) => {
      map[step.id] = step
      return map
    },
    {},
  )

  const mainSections = mainQuestDefinitions
    .map((quest) => {
      const rewards = quest.rewards
        .map((reward) => `- ${reward.label}: ${reward.description}`)
        .join('\n')

      const stepRows = quest.stepIds
        .map((stepId, index) => {
          const step = stepById[stepId]
          if (!step) {
            return null
          }

          return [
            `### Step ${index + 1}: ${step.title} (\`${step.id}\`)`,
            '',
            `- Description: ${step.description}`,
            step.detail ? `- Detail: ${step.detail}` : null,
            step.hint ? `- Hint: ${step.hint}` : null,
            step.focusTarget ? `- Focus target: \`${step.focusTarget}\`` : null,
            step.labTab ? `- Lab tab: \`${step.labTab}\`` : null,
            '',
          ]
            .filter(Boolean)
            .join('\n')
        })
        .filter(Boolean)
        .join('\n')

      return [
        `## Main Quest: ${quest.title} (\`${quest.id}\`)`,
        '',
        `- Summary: ${quest.summary}`,
        '',
        '- Rewards:',
        rewards,
        '',
        stepRows,
      ].join('\n')
    })
    .join('\n\n')

  const sideSections = sideQuestDefinitions
    .map((sideQuest) => {
      const sideSteps = sideQuest.steps
        .map(
          (step, index) =>
            [
              `### Side Step ${index + 1}: ${step.title} (\`${step.id}\`)`,
              '',
              `- Description: ${step.description}`,
              `- Detail: ${step.detail}`,
              '',
            ].join('\n'),
        )
        .join('\n')

      return [
        `### ${sideQuest.title} (\`${sideQuest.id}\`)`,
        '',
        `- Summary: ${sideQuest.summary}`,
        '',
        '- Rewards:',
        ...sideQuest.rewards.map((reward) => `- ${reward.label}: ${reward.description}`),
        '',
        sideSteps,
      ].join('\n')
    })
    .join('\n')

  const content = [
    AUTO_GENERATED_HEADER,
    '# Quest Reference',
    '',
    'This page is generated from quest definitions and updates with objective changes.',
    '',
    mainSections,
    '## Side Quest',
    sideSections,
  ].join('\n')

  return {
    meta: {
      slug: 'reference-quests',
      title: 'Quest Reference',
      summary: 'Generated objective definitions for main and side quests.',
      tags: ['reference', 'quests', 'objectives'],
    },
    filename: 'reference-quests.mdx',
    content,
  }
}
