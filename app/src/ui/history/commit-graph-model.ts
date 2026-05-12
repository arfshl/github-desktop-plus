import { Commit } from '../../models/commit'

const commitGraph_Colors = [
  '#2f9e44',
  '#1c7ed6',
  '#ae3ec9',
  '#f08c00',
  '#0ca678',
  '#e64980',
  '#5c7cfa',
  '#868e96',
  '#e03131',
  '#087f5b',
  '#1971c2',
  '#9c36b5',
  '#e8590c',
  '#0b7285',
  '#c2255c',
  '#5f3dc4',
  '#66a80f',
  '#d9480f',
  '#1864ab',
  '#862e9c',
  '#2b8a3e',
  '#c92a2a',
  '#364fc7',
  '#099268',
]

const commitGraph_BackgroundColor = '#9ea4aa'

// SmartGit caps connector length at 100 rows. Avoid reserving merge-parent
// lanes indefinitely, which can make busy histories much wider than needed.
const commitGraph_MaxMergeConnectorRows = 100

interface ICommitGraphActiveLane {
  readonly sha: string
  readonly color: string
}

export interface ICommitGraphRefColor {
  readonly sha: string
  readonly color: string
}

export interface ICommitGraphLane {
  readonly column: number
  readonly color: string
}

export interface ICommitGraphConnection {
  readonly fromColumn: number
  readonly toColumn: number
  readonly color: string
}

export interface ICommitGraphLaneShift {
  readonly fromColumn: number
  readonly toColumn: number
  readonly color: string
}

export interface ICommitGraphRow {
  readonly sha: string
  readonly column: number
  readonly color: string
  readonly hasTopLine: boolean
  readonly lanes: ReadonlyArray<ICommitGraphLane>
  readonly connections: ReadonlyArray<ICommitGraphConnection>
  readonly shifts: ReadonlyArray<ICommitGraphLaneShift>
  /**
   * Largest graph column touched by this row, for sizing the row SVG.
   */
  readonly maxColumn: number
}

export const commitGraph_RowHeight = 32

export function commitGraph_getColor(index: number) {
  if (index < commitGraph_Colors.length) {
    return commitGraph_Colors[index]
  }

  const hue = Math.round((index * 137.508) % 360)
  return `hsl(${hue}, 72%, 42%)`
}

export function commitGraph_buildRows(
  commits: ReadonlyArray<Commit>,
  refColors: ReadonlyArray<ICommitGraphRefColor> = [],
  primaryLaneSha?: string
): ReadonlyArray<ICommitGraphRow> {
  const rowIndexBySha = new Map<string, number>()
  const colorsBySha = new Map<string, string>()
  const seededColorsBySha = new Map<string, string>()
  const usedColors = new Set<string>()
  const useBackgroundForUnseededLanes = refColors.length > 0
  let nextColor = 0
  let lanes = new Array<ICommitGraphActiveLane>()

  for (let rowIndex = 0; rowIndex < commits.length; rowIndex++) {
    const commit = commits[rowIndex]

    rowIndexBySha.set(commit.sha, rowIndex)
  }

  for (const refColor of refColors) {
    if (seededColorsBySha.has(refColor.sha)) {
      continue
    }

    seededColorsBySha.set(refColor.sha, refColor.color)
    colorsBySha.set(refColor.sha, refColor.color)
    usedColors.add(refColor.color)
  }

  const colorForSha = (sha: string) => {
    let color = colorsBySha.get(sha)

    if (color === undefined) {
      if (useBackgroundForUnseededLanes) {
        color = commitGraph_BackgroundColor
      } else {
        do {
          color = commitGraph_getColor(nextColor)
          nextColor++
        } while (usedColors.has(color))

        usedColors.add(color)
      }

      colorsBySha.set(sha, color)
    }

    return color
  }

  // Seed the current branch lane first so it remains the left-most lane when
  // its tip is part of the rendered graph.
  if (primaryLaneSha !== undefined && rowIndexBySha.has(primaryLaneSha)) {
    lanes = [{ sha: primaryLaneSha, color: colorForSha(primaryLaneSha) }]
  }

  const rows = commits.map((commit, rowIndex) => {
    let column = lanes.findIndex(l => l.sha === commit.sha)
    const hasTopLine = column >= 0

    if (column < 0) {
      column = lanes.length
      lanes.push({ sha: commit.sha, color: colorForSha(commit.sha) })
    }

    const seededColor = seededColorsBySha.get(commit.sha)

    if (seededColor !== undefined && lanes[column].color !== seededColor) {
      lanes[column] = { ...lanes[column], color: seededColor }
    }

    const currentLane = lanes[column]
    const lanesToContinue = new Array<ICommitGraphLane>()
    for (let laneColumn = 0; laneColumn < lanes.length; laneColumn++) {
      if (laneColumn !== column) {
        const lane = lanes[laneColumn]
        lanesToContinue.push({ column: laneColumn, color: lane.color })
      }
    }

    const parents = new Array<string>()
    for (let i = 0; i < commit.parentSHAs.length; i++) {
      const sha = commit.parentSHAs[i]
      const parentRowIndex = rowIndexBySha.get(sha)

      if (parentRowIndex === undefined) {
        continue
      }

      const isLongMergeConnector =
        i > 0 &&
        !lanes.some(lane => lane.sha === sha) &&
        parentRowIndex - rowIndex > commitGraph_MaxMergeConnectorRows

      if (!isLongMergeConnector) {
        parents.push(sha)
      }
    }

    // The first parent continues the current lane. Additional merge parents get
    // temporary lanes until their commits are reached lower in the list.
    let nextLanes = lanes.slice()

    if (parents.length > 0) {
      nextLanes[column] = { sha: parents[0], color: currentLane.color }
    } else {
      nextLanes.splice(column, 1)
    }

    for (let i = 1; i < parents.length; i++) {
      const parent = parents[i]
      if (!nextLanes.some(lane => lane.sha === parent)) {
        nextLanes.splice(Math.min(column + 1, nextLanes.length), 0, {
          sha: parent,
          color: colorForSha(parent),
        })
      }
    }

    nextLanes = commitGraph_dedupeLanes(nextLanes)

    const columnsByParentSha = new Map<string, number>()
    for (let laneColumn = 0; laneColumn < nextLanes.length; laneColumn++) {
      columnsByParentSha.set(nextLanes[laneColumn].sha, laneColumn)
    }

    const shifts = new Array<ICommitGraphLaneShift>()
    for (let laneColumn = 0; laneColumn < lanes.length; laneColumn++) {
      if (laneColumn === column) {
        continue
      }

      const lane = lanes[laneColumn]
      const nextColumn = columnsByParentSha.get(lane.sha)

      if (nextColumn === undefined || nextColumn === laneColumn) {
        continue
      }

      const nextLane = nextLanes[nextColumn]

      shifts.push({
        fromColumn: laneColumn,
        toColumn: nextColumn,
        color: nextLane?.color ?? lane.color,
      })
    }

    const connections = new Array<ICommitGraphConnection>()
    for (const parent of parents) {
      const toColumn = columnsByParentSha.get(parent) ?? column
      const parentLane = nextLanes[toColumn]

      connections.push({
        fromColumn: column,
        toColumn,
        color: parentLane?.color ?? currentLane.color,
      })
    }

    lanes = nextLanes

    return {
      sha: commit.sha,
      column,
      color: currentLane.color,
      hasTopLine,
      lanes: lanesToContinue,
      connections,
      shifts,
    }
  })

  return rows.map(row => ({
    ...row,
    maxColumn: commitGraph_getRowMaxColumn(row),
  }))
}

function commitGraph_getRowMaxColumn(
  row: Pick<ICommitGraphRow, 'column' | 'lanes' | 'shifts' | 'connections'>
) {
  return Math.max(
    row.column,
    ...row.lanes.map(lane => lane.column),
    ...row.shifts.flatMap(shift => [shift.fromColumn, shift.toColumn]),
    ...row.connections.flatMap(connection => [
      connection.fromColumn,
      connection.toColumn,
    ])
  )
}

function commitGraph_dedupeLanes(
  lanes: ReadonlyArray<ICommitGraphActiveLane>
): Array<ICommitGraphActiveLane> {
  const seen = new Set<string>()
  const deduped = new Array<ICommitGraphActiveLane>()

  for (const lane of lanes) {
    if (seen.has(lane.sha)) {
      continue
    }

    seen.add(lane.sha)
    deduped.push(lane)
  }

  return deduped
}
