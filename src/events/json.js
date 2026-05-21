const request = require('sync-request')

module.exports = {
  getNext (source, options) {
    try {
      const dataRaw = request('GET', source.source)
      const data = JSON.parse(dataRaw.getBody('utf8'))
      const now = new Date().getTime()
      if (Array.isArray(data)) {
        const upcoming = data
          .filter(item => item && typeof item.date === 'number' && item.date > now)
          .sort((a, b) => a.date - b.date)
        return upcoming.length > 0 ? upcoming[0] : []
      }
      if (data.date > now) {
        return data
      }
    } catch (e) {
      console.log(e)
    }

    return []
  },
  getPrev (source, options) {
    try {
      const dataRaw = request('GET', source.source)
      const data = JSON.parse(dataRaw.getBody('utf8'))
      const now = new Date().getTime()
      if (Array.isArray(data)) {
        const past = data
          .filter(item => item && typeof item.date === 'number' && item.date < now)
          .sort((a, b) => b.date - a.date)
        return past.length > 0 ? past[0] : []
      }
      if (data.date < now) {
        return data
      }
    } catch (e) {
      console.log(e)
    }

    return []
  }
}
