import { userMenu } from '@protobase/schema'

/** The profile menu's own pages: the messages, searched there for more than the top bar's results, and Users, for admins. */
export const accountMenu = userMenu((m) => [m.resource('messages', { label: 'Search messages', icon: 'search' }), m.page('accounts', { label: 'Users', icon: 'users' })])
