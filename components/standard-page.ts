import type { AppAddress } from '@protobase/schema'
import type { LayoutRecord } from '@protobase/ui'

/** A conversation's standard record page, with its details, members, Edit and Delete, beside the chat that is its page. */
export const standardPage = ({ model, key }: Pick<LayoutRecord, 'model' | 'key'>): AppAddress => ({ kind: 'record', resource: model.name, key, standard: true })
