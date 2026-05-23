const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')
const path = require('path')

const meetupModulePath = path.resolve(__dirname, '../src/events/meetup.js')

function loadMeetupWithMockedRequest(mockRequest) {
  const originalLoad = Module._load

  delete require.cache[meetupModulePath]
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'sync-request') {
      return mockRequest
    }

    return originalLoad.apply(this, arguments)
  }

  try {
    return require(meetupModulePath)
  } finally {
    Module._load = originalLoad
  }
}

test('Meetup getNext parses upcoming RSS events from JSON-LD pages', () => {
  const calls = []
  const now = Date.now()
  const futureDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  const pastDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const rssFeed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[Future Event]]></title>
      <link>https://www.meetup.com/test-group/events/1/</link>
      <description><![CDATA[📍 ONLINE<br />🗓 March 26, 2026 | 18:00-20:30]]></description>
    </item>
    <item>
      <title><![CDATA[Past Event]]></title>
      <link>https://www.meetup.com/test-group/events/2/</link>
      <description><![CDATA[📍 Old venue<br />🗓 March 20, 2020 | 18:00-20:30]]></description>
    </item>
  </channel>
</rss>`
  const eventPages = {
    'https://www.meetup.com/test-group/events/1/': `<html><head><script type="application/ld+json" data-next-head="">${JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        startDate: futureDate,
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: {
          '@type': 'VirtualLocation',
          url: 'https://www.meetup.com/test-group/events/1/',
        },
      },
    )}</script></head></html>`,
    'https://www.meetup.com/test-group/events/2/': `<html><head><script type="application/ld+json" data-next-head="">${JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        startDate: pastDate,
        location: {
          '@type': 'Place',
          name: 'Old venue',
        },
      },
    )}</script></head></html>`,
  }

  const meetup = loadMeetupWithMockedRequest((method, url) => {
    calls.push({ method, url })

    if (url === 'https://www.meetup.com/test-group/events/rss/') {
      return {
        getBody() {
          return rssFeed
        },
      }
    }

    if (eventPages[url]) {
      return {
        getBody() {
          return eventPages[url]
        },
      }
    }

    throw new Error(`Unexpected URL ${url}`)
  })

  const events = meetup.getNext({ meetupid: 'test-group' }, {})

  assert.deepEqual(events, [
    {
      sourceId: 'test-group-1',
      title: 'Future Event',
      date: new Date(futureDate).getTime(),
      url: 'https://www.meetup.com/test-group/events/1/',
      location: 'Online event',
    },
  ])
  assert.equal(calls.length, 3)
})

test('Meetup getPrev returns an empty array', () => {
  const meetup = loadMeetupWithMockedRequest(() => {
    throw new Error('sync-request should not be called for getPrev')
  })

  assert.deepEqual(meetup.getPrev({ meetupid: 'test-group' }, {}), [])
})

test('Meetup getNext falls back to parsing date ranges from description when JSON-LD date is missing', () => {
  const now = Date.now()
  const futureDate = new Date(now + 7 * 24 * 60 * 60 * 1000)
  const month = futureDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  const day = futureDate.getUTCDate()
  const year = futureDate.getUTCFullYear()
  const rssFeed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[Fallback Event]]></title>
      <link>https://www.meetup.com/test-group/events/3/</link>
      <description><![CDATA[📍 ONLINE<br />🗓 ${month} ${day}, ${year} | 18:00-20:30]]></description>
    </item>
  </channel>
</rss>`

  const meetup = loadMeetupWithMockedRequest((method, url) => {
    if (url === 'https://www.meetup.com/test-group/events/rss/') {
      return {
        getBody() {
          return rssFeed
        },
      }
    }

    if (url === 'https://www.meetup.com/test-group/events/3/') {
      return {
        getBody() {
          return '<html><head></head><body>No event json-ld</body></html>'
        },
      }
    }

    throw new Error(`Unexpected URL ${url}`)
  })

  const events = meetup.getNext({ meetupid: 'test-group' }, {})

  assert.equal(events.length, 1)
  assert.equal(events[0].title, 'Fallback Event')
  assert.equal(events[0].url, 'https://www.meetup.com/test-group/events/3/')
  assert.equal(events[0].location, 'ONLINE')
  assert.equal(typeof events[0].date, 'number')
})
