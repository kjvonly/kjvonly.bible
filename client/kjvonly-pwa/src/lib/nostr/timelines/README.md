# rxnostr

Attempting to use rxnostr and some ideas from nostter app in order to store
KJVonly bible data in a decentralized way.

## Phase 1

- Replace existing relay service with rxnostr.
- Follow nostter conventions to make borrowing functions easier.
  - Add w/e license info required

### Tasks

- implement the backward and forward filter and reqs
- support nsec for login
  - add support for required kinds e.g. profile, contact list, relay list etc..
- slice through the app
  - updating the existing services to use rxnostr
  - maybe altering structure or api driven flow to a event driven flow
