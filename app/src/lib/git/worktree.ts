import { git } from './core'
import { Repository } from '../../models/repository'

/**
 * Get the set of canonical branch refs (e.g. `refs/heads/feature`)
 * checked out in linked worktrees.
 *
 * Excludes the main worktree — that's already handled by the HEAD check.
 */
export async function getWorktreeCheckedOutBranches(
  repository: Repository
): Promise<ReadonlySet<string>> {
  const result = await git(
    ['worktree', 'list', '--porcelain', '-z'],
    repository.path,
    'getWorktreeCheckedOutBranches'
  )

  const branches = new Set<string>()

  // With -z, lines are NUL-terminated and blocks are separated by
  // double NUL (i.e. an empty string between two NUL terminators).
  // First block is always the main worktree — skip it.
  const blocks = result.stdout.split('\0\0').slice(1)

  for (const block of blocks) {
    for (const line of block.split('\0')) {
      if (line.startsWith('branch ')) {
        branches.add(line.substring('branch '.length))
      }
    }
  }

  return branches
}
