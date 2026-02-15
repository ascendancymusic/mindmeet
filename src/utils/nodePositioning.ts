
import { NoteItem, FolderItem } from '../pages/Notes'

export const getChildPosition = (
    parentId: string | null,
    currentFolders: FolderItem[],
    currentNotes: NoteItem[]
  ): { x: number; y: number } => {
    const spacingX = 260
    const spacingY = 180
    const minDistance = 140 // how close two nodes can be before we consider it occupied

    // Collect all occupied positions from stored data
    const occupied = [
      ...currentFolders
        .map((f) => f.position)
        .filter((p): p is { x: number; y: number } => !!p),
      ...currentNotes
        .map((n) => n.position)
        .filter((p): p is { x: number; y: number } => !!p),
    ]

    const isFree = (pt: { x: number; y: number }) => {
      return !occupied.some((p) => {
        const dx = p.x - pt.x
        const dy = p.y - pt.y
        return Math.hypot(dx, dy) < minDistance
      })
    }

    const parentFolder = parentId ? currentFolders.find((f) => f.id === parentId) : null
    const parentNote = parentId ? currentNotes.find((n) => n.id === parentId) : null
    const base = parentFolder?.position || parentNote?.position || { x: 0, y: 0 }

    // If root, bias towards y=50 and try spreading horizontally near existing roots
    if (!parentId) {
      const tryPoints: { x: number; y: number }[] = []
      // Sample a small grid around origin to find first free slot
      for (let ring = 0; ring < 6; ring++) {
        for (let dx = -ring; dx <= ring; dx++) {
          const x = dx * spacingX
          const y = 50 + ring * spacingY
          tryPoints.push({ x, y })
        }
      }
      const found = tryPoints.find(isFree)
      return found || { x: tryPoints[tryPoints.length - 1].x, y: tryPoints[tryPoints.length - 1].y }
    }

    // For children, start directly under parent, then spiral out to find space
    const candidates: { x: number; y: number }[] = []
    const rings = 6
    for (let ring = 0; ring <= rings; ring++) {
      const offsets = [
        { x: 0, y: ring },
        { x: ring, y: ring },
        { x: -ring, y: ring },
        { x: ring, y: 0 },
        { x: -ring, y: 0 },
        { x: ring, y: -ring },
        { x: -ring, y: -ring },
      ]
      offsets.forEach((o) => {
        candidates.push({ x: base.x + o.x * spacingX, y: base.y + spacingY + o.y * spacingY })
      })
    }

    const found = candidates.find(isFree)
    return found || { x: base.x, y: base.y + spacingY }
  }
