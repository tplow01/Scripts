import { redirect } from 'next/navigation'

// The Game Boy loading/start screen now lives at the root entry (`/`), which
// always boots into it before the game. Keep this path as a redirect so old
// links still land in the right place.
export default function LoadingRedirect() {
  redirect('/')
}
