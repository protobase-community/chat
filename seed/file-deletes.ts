import type { ScheduledDelete } from '@protobase/server'

/**
 * The scheduled delete of a stored file value, `{provider}:{path}?name=…&variants=card.webp,…`, with its image variants,
 * stored beside it as `{path}.{name}.{extension}`.
 */
export const scheduledDelete = (value: string, due: Date): ScheduledDelete => {
  const match = /^([a-z][a-z0-9-]*):([^?#]+)(?:\?([^#]*))?$/.exec(value)
  if (!match) throw new Error(`"${value}" is not a stored file`)
  const [, provider, path, query] = match
  const listed = new URLSearchParams(query ?? '').get('variants')
  const variants = listed ? listed.split(',').map((variant) => `${path}.${variant}`) : []
  return { provider: provider!, path: path!, due, ...(variants.length > 0 && { variants }) }
}
