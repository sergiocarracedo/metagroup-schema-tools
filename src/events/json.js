const request = require('sync-request')

function parseDate(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return new Date(value).getTime()
  return NaN
}

function normalizeEventDate(event) {
  const parsedDate = parseDate(event.date)
  if (!isFinite(parsedDate)) return null

  return {
    ...event,
    date: parsedDate,
  }
}

module.exports = {
  getNext(source, options) {
    try {
      const dataRaw = request('GET', source.source)
      const data = JSON.parse(dataRaw.getBody('utf8'))
      const now = new Date().getTime()
      if (Array.isArray(data)) {
        const upcoming = data
          .map((item) => item && normalizeEventDate(item))
          .filter((item) => item && item.date > now)
          .sort((a, b) => a.date - b.date)
        return upcoming.length > 0 ? upcoming[0] : []
      }
      const normalizedEvent = data && normalizeEventDate(data)
      if (normalizedEvent && normalizedEvent.date > now) {
        return normalizedEvent
      }
    } catch (e) {
      console.log(e)
    }

    return []
  },
  getPrev(source, options) {
    try {
      const dataRaw = request('GET', source.source)
      const data = JSON.parse(dataRaw.getBody('utf8'))
      const now = new Date().getTime()
      if (Array.isArray(data)) {
        const past = data
          .map((item) => item && normalizeEventDate(item))
          .filter((item) => item && item.date < now)
          .sort((a, b) => b.date - a.date)
        return past.length > 0 ? past[0] : []
      }
      const normalizedEvent = data && normalizeEventDate(data)
      if (normalizedEvent && normalizedEvent.date < now) {
        return normalizedEvent
      }
    } catch (e) {
      console.log(e)
    }

    return []
  },
}
