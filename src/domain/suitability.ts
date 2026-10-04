import type { CatalogItem, ScareLevel, ThrillLevel } from './catalog'
import { SCARE_LEVELS, THRILL_LEVELS } from './catalog'

/** Limits for the group: the shortest member's height and what the group tolerates. */
export interface GroupProfile {
  heightCm?: number
  maxThrill?: ThrillLevel
  maxScare?: ScareLevel
}

/** Why an item does not suit the profile, e.g. "Needs 120 cm". Undefined when it suits. */
export function unsuitableReason(item: CatalogItem, profile: GroupProfile | undefined): string | undefined {
  if (!profile || item.type !== 'attraction') return undefined
  const reasons: string[] = []
  if (profile.heightCm !== undefined && item.minHeightCm !== null && item.minHeightCm > profile.heightCm) {
    reasons.push(`Needs ${item.minHeightCm} cm`)
  }
  if (profile.maxThrill !== undefined && item.thrill > profile.maxThrill) reasons.push(`Too intense (${THRILL_LEVELS[item.thrill - 1]})`)
  if (profile.maxScare !== undefined && item.scare > profile.maxScare) reasons.push(`Too scary (${SCARE_LEVELS[item.scare]})`)
  return reasons.length > 0 ? reasons.join(' · ') : undefined
}
