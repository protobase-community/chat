import type { useClient } from '@protobase/ui'

/** A change the live stream tells of, as `client.live` gives it. */
export type LiveChange = Parameters<Parameters<ReturnType<typeof useClient>['live']>[0]['onChanges']>[0][number]

/** The changes of `resource` in a batch the live stream gives: whether any is a create, and the keys updated and deleted. */
export const changesOf = (changes: readonly LiveChange[], resource: string) => {
  const created = changes.some((change) => change.resource === resource && (change.operation === 'create' || change.operation === 'undelete'))
  const keys = (operation: LiveChange['operation']) =>
    new Set(changes.filter((change) => change.resource === resource && change.operation === operation).map((change) => Number(change.key)))
  return { created, updated: keys('update'), deleted: keys('delete') }
}
