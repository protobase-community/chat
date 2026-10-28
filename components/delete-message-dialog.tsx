import { Button, Dialog } from '@protobase/ui'

/** Asks before a message is deleted, since it goes for everyone in the conversation, with its reactions. */
export const DeleteMessageDialog = ({ onDelete, onClose }: { onDelete: () => void; onClose: () => void }) => (
  <Dialog
    title="Delete this message?"
    description="It goes for everyone in the conversation, with its reactions. This cannot be undone."
    onClose={onClose}
    actions={
      <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onDelete}>
          Delete
        </Button>
      </>
    }
  />
)
