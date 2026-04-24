import assert from 'node:assert'
import { describe, it } from 'node:test'
import { buildCommitMessageSystemPrompt } from '../../src/lib/stores/copilot-store'
import {
  IRepoRulesMetadataRule,
  RepoRuleEnforced,
} from '../../src/models/repo-rules'

function makeRule(
  humanDescription: string,
  enforced: RepoRuleEnforced = true
): IRepoRulesMetadataRule {
  return {
    enforced,
    humanDescription,
    matcher: () => true,
    rulesetId: 1,
  }
}

describe('buildCommitMessageSystemPrompt', () => {
  it('returns the base system prompt unchanged when no rules are provided', () => {
    const base = buildCommitMessageSystemPrompt()
    const baseEmpty = buildCommitMessageSystemPrompt([])
    assert.equal(base, baseEmpty)
    assert.ok(
      !base.includes('commit message rules'),
      'base prompt should not mention commit message rules'
    )
  })

  it('returns the base system prompt unchanged when all rules are not enforced for the user', () => {
    const base = buildCommitMessageSystemPrompt()
    const augmented = buildCommitMessageSystemPrompt([
      makeRule('must start with "[DESK-123]"', false),
    ])
    assert.equal(augmented, base)
  })

  it('appends a constraints section listing each enforced rule', () => {
    const base = buildCommitMessageSystemPrompt()
    const augmented = buildCommitMessageSystemPrompt([
      makeRule('must start with "[DESK-123]"', true),
      makeRule('must not contain "WIP"', 'bypass'),
      makeRule('only enforced for some users', false),
    ])

    assert.ok(
      augmented.startsWith(base),
      'augmented prompt should start with the base prompt'
    )
    assert.ok(augmented.includes('- must start with "[DESK-123]"'))
    assert.ok(augmented.includes('- must not contain "WIP"'))
    assert.ok(
      !augmented.includes('only enforced for some users'),
      'unenforced rules should not be sent to the model'
    )
    assert.ok(
      augmented.includes('combined commit message'),
      'augmented prompt should explain that the constraints apply to the full commit message'
    )
  })
})
