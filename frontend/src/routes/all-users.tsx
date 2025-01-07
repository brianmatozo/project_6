import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/all-users')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/all-users"!</div>
}
