const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')

function loadEventsJson(body) {
  const jsonModulePath = require.resolve('../src/events/json.js')
  const originalLoad = Module._load

  delete require.cache[jsonModulePath]

  Module._load = function (request, parent, isMain) {
    if (request === 'sync-request') {
      return function () {
        return {
          getBody() {
            return body
          },
        }
      }
    }

    return originalLoad.apply(this, arguments)
  }

  try {
    return require('../src/events/json.js')
  } finally {
    Module._load = originalLoad
  }
}

test('getNext keeps supporting a single future event object', () => {
  const event = {
    title: 'Next event',
    date: Date.now() + 10000,
    url: 'https://example.com/next',
  }
  const eventsJson = loadEventsJson(JSON.stringify(event))

  assert.deepEqual(
    eventsJson.getNext({ source: 'https://example.com/events.json' }, {}),
    event,
  )
})

test('getPrev keeps supporting a single past event object', () => {
  const event = {
    title: 'Previous event',
    date: Date.now() - 10000,
    url: 'https://example.com/prev',
  }
  const eventsJson = loadEventsJson(JSON.stringify(event))

  assert.deepEqual(
    eventsJson.getPrev({ source: 'https://example.com/events.json' }, {}),
    event,
  )
})

test('getNext returns the earliest upcoming event from an array and ignores malformed entries', () => {
  const now = Date.now()
  const selectedEvent = {
    title: 'Soonest upcoming event',
    date: now + 10000,
    url: 'https://example.com/soonest',
  }
  const eventsJson = loadEventsJson(
    JSON.stringify([
      {
        title: 'Later upcoming event',
        date: now + 20000,
        url: 'https://example.com/later',
      },
      {
        title: 'Missing date',
      },
      {
        title: 'Invalid date',
        date: 'tomorrow',
      },
      {
        title: 'Past event',
        date: now - 10000,
        url: 'https://example.com/past',
      },
      selectedEvent,
    ]),
  )

  assert.deepEqual(
    eventsJson.getNext({ source: 'https://example.com/events.json' }, {}),
    selectedEvent,
  )
})

test('getPrev returns the latest past event from an array and ignores malformed entries', () => {
  const now = Date.now()
  const selectedEvent = {
    title: 'Latest past event',
    date: now - 10000,
    url: 'https://example.com/latest-past',
  }
  const eventsJson = loadEventsJson(
    JSON.stringify([
      {
        title: 'Older past event',
        date: now - 20000,
        url: 'https://example.com/older-past',
      },
      {
        title: 'Missing date',
      },
      {
        title: 'Invalid date',
        date: 'yesterday',
      },
      {
        title: 'Future event',
        date: now + 10000,
        url: 'https://example.com/future',
      },
      selectedEvent,
    ]),
  )

  assert.deepEqual(
    eventsJson.getPrev({ source: 'https://example.com/events.json' }, {}),
    selectedEvent,
  )
})

test('getNext supports a single future event with ISO 8601 date string', () => {
  const futureISO = new Date(Date.now() + 10000).toISOString()
  const event = {
    title: 'ISO future event',
    date: futureISO,
    url: 'https://example.com/iso-next',
  }
  const eventsJson = loadEventsJson(JSON.stringify(event))

  assert.deepEqual(
    eventsJson.getNext({ source: 'https://example.com/events.json' }, {}),
    {
      ...event,
      date: new Date(futureISO).getTime(),
    },
  )
})

test('getPrev supports a single past event with ISO 8601 date string', () => {
  const pastISO = new Date(Date.now() - 10000).toISOString()
  const event = {
    title: 'ISO past event',
    date: pastISO,
    url: 'https://example.com/iso-prev',
  }
  const eventsJson = loadEventsJson(JSON.stringify(event))

  assert.deepEqual(
    eventsJson.getPrev({ source: 'https://example.com/events.json' }, {}),
    {
      ...event,
      date: new Date(pastISO).getTime(),
    },
  )
})

test('getNext returns the earliest upcoming event from an array mixing ISO and unix timestamps', () => {
  const now = Date.now()
  const selectedDate = new Date(now + 10000).toISOString()
  const selectedEvent = {
    title: 'Soonest ISO event',
    date: selectedDate,
    url: 'https://example.com/iso-soonest',
  }
  const eventsJson = loadEventsJson(
    JSON.stringify([
      {
        title: 'Later unix event',
        date: now + 20000,
        url: 'https://example.com/unix-later',
      },
      {
        title: 'Past ISO event',
        date: new Date(now - 10000).toISOString(),
        url: 'https://example.com/iso-past',
      },
      {
        title: 'Invalid ISO string',
        date: 'not-a-date',
      },
      selectedEvent,
    ]),
  )

  assert.deepEqual(
    eventsJson.getNext({ source: 'https://example.com/events.json' }, {}),
    {
      ...selectedEvent,
      date: new Date(selectedDate).getTime(),
    },
  )
})

test('getPrev returns the latest past event from an array mixing ISO and unix timestamps', () => {
  const now = Date.now()
  const selectedDate = new Date(now - 10000).toISOString()
  const selectedEvent = {
    title: 'Latest ISO past event',
    date: selectedDate,
    url: 'https://example.com/iso-latest-past',
  }
  const eventsJson = loadEventsJson(
    JSON.stringify([
      {
        title: 'Older unix event',
        date: now - 20000,
        url: 'https://example.com/unix-older',
      },
      {
        title: 'Future ISO event',
        date: new Date(now + 10000).toISOString(),
        url: 'https://example.com/iso-future',
      },
      {
        title: 'Invalid ISO string',
        date: 'not-a-date',
      },
      selectedEvent,
    ]),
  )

  assert.deepEqual(
    eventsJson.getPrev({ source: 'https://example.com/events.json' }, {}),
    {
      ...selectedEvent,
      date: new Date(selectedDate).getTime(),
    },
  )
})
