import { useEffect } from 'react'
import { Spinner, useAppAddress, useLayoutRecord } from '@protobase/ui'
import { messageAddress } from './thread-address'

/**
 * A message's record page, which a search result links to: it opens the message where it was written, in its
 * conversation, or in its thread beside it for a reply, in place of this page, so Back returns to where the search was.
 */
export const MessagePlace = () => {
  const { record } = useLayoutRecord()!
  const { go, href } = useAppAddress()
  const place = messageAddress(record)
  // Keyed by where it goes, as text: the address object is made anew on each render.
  const target = place && href(place)
  useEffect(() => {
    if (place) go(place, { replace: true })
  }, [target])
  if (!place) throw new Error('Not implemented: a message is in a channel or a direct message, which the database checks')
  return (
    <div className="flex justify-center p-8">
      <Spinner />
    </div>
  )
}
