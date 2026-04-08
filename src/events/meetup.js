const moment = require('moment')
const request = require('sync-request')

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function getSourceId(source, item, date) {
  const itemUrl = item.url || ''
  const idFromUrlMatch = itemUrl.match(/\/events\/(\d+)\/?$/)
  const idFromUrl = idFromUrlMatch ? idFromUrlMatch[1] : null
  const groupId = source && source.meetupid ? source.meetupid : 'meetup'

  if (idFromUrl) {
    return `${groupId}-${idFromUrl}`
  }

  if (date) {
    return `${groupId}-${date}-${slugify(item.title || 'event')}`
  }

  return `${groupId}-${slugify(item.title || 'event')}`
}

function decodeHtml(value) {
  return (value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/\\,/g, ',')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function getTagValue(block, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')
  const match = block.match(regex)
  return match ? decodeHtml(match[1]) : ''
}

function getJsonLdEvent(html) {
  const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || []

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)

    if (!match) {
      continue
    }

    try {
      const data = JSON.parse(match[1])
      if (data['@type'] === 'Event') {
        return data
      }
    } catch (e) {
      continue
    }
  }

  return null
}

function getLocationFromEventData(eventData) {
  if (!eventData || !eventData.location) {
    return ''
  }

  if (eventData.eventAttendanceMode === 'https://schema.org/OnlineEventAttendanceMode') {
    return 'Online event'
  }

  if (eventData.location['@type'] === 'VirtualLocation') {
    return 'Online event'
  }

  const location = eventData.location
  const address = location.address || {}
  return [
    location.name,
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry
  ].filter(Boolean).join(' - ')
}

function getDateFromDescription(description) {
  const normalized = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')

  const lines = normalized
    .split('\n')
    .map(line => decodeHtml(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const dateLine = lines.find(line => /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i.test(line))

  if (!dateLine) {
    return null
  }

  const cleaned = dateLine.replace(/^[^A-Za-z0-9]+/, '').split(' - ')[0].trim()
  const formats = [
    'MMMM D, YYYY | HH:mm',
    'MMMM D, YYYY | H:mm',
    'MMM D, YYYY | HH:mm',
    'MMM D, YYYY | H:mm'
  ]

  const parsed = moment(cleaned, formats, true)
  return parsed.isValid() ? parsed.valueOf() : null
}

function getLocationFromDescription(description) {
  const normalized = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')

  const lines = normalized
    .split('\n')
    .map(line => decodeHtml(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const locationLine = lines.find(line => /^(📍|location[: ]|online\b)/i.test(line))

  if (!locationLine) {
    return ''
  }

  return locationLine.replace(/^📍\s*/i, '').trim()
}

function getEventDetails(url, description) {
  try {
    const pageRaw = request('GET', url)
    const page = pageRaw.getBody('utf8')
    const eventData = getJsonLdEvent(page)

    if (eventData) {
      return {
        date: eventData.startDate ? new Date(eventData.startDate).getTime() : getDateFromDescription(description),
        location: getLocationFromEventData(eventData) || getLocationFromDescription(description)
      }
    }
  } catch (e) {
    console.log(e)
  }

  return {
    date: getDateFromDescription(description),
    location: getLocationFromDescription(description)
  }
}

function getFeedItems(source) {
  const feedUrl = `https://www.meetup.com/${source.meetupid}/events/rss/`
  const dataRaw = request('GET', feedUrl)
  const xml = dataRaw.getBody('utf8')
  const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || []

  return items.map(itemBlock => ({
    title: getTagValue(itemBlock, 'title'),
    url: getTagValue(itemBlock, 'link'),
    description: getTagValue(itemBlock, 'description')
  }))
}

module.exports = {
  getNext(source, options) {
    const nextEvents = []

    try {
      getFeedItems(source).forEach(item => {
        const eventDetails = getEventDetails(item.url, item.description)

        if (eventDetails.date !== null && eventDetails.date >= new Date().getTime()) {
          nextEvents.push({
            sourceId: getSourceId(source, item, eventDetails.date),
            title: item.title,
            date: eventDetails.date,
            url: item.url,
            location: eventDetails.location || ''
          })
        }
      })
    } catch (e) {
      console.log(e)
    }

    return nextEvents
  },

  getPrev(source, options) {
    return []
  }
}
