const test = require('node:test')
const assert = require('node:assert/strict')

const runMeetupE2E = process.env.ENABLE_E2E_MEETUP === '1' ? test : test.skip

runMeetupE2E('Meetup E2E fetches one event from aindustriosa RSS', () => {
  const meetup = require('../src/events/meetup.js')

  const events = meetup.getNext({ meetupid: 'aindustriosa' }, {})

  assert.equal(Array.isArray(events), true)
  assert.equal(events.length, 1)
  assert.equal(typeof events[0].title, 'string')
  assert.equal(typeof events[0].url, 'string')
  assert.equal(typeof events[0].date, 'number')
})
