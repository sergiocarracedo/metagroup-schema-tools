const RssParser = require('rss-parser')

const parser = new RssParser()

function getVideoId(item) {
  if (item.id) {
    const parts = item.id.split(':')
    return parts[parts.length - 1]
  }

  if (item.link) {
    try {
      const url = new URL(item.link)
      return url.searchParams.get('v')
    } catch (e) {
      return null
    }
  }

  return null
}

function getThumbnails(videoId) {
  return {
    default: {
      url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
      width: 120,
      height: 90
    },
    medium: {
      url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      width: 320,
      height: 180
    },
    high: {
      url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      width: 480,
      height: 360
    }
  }
}

module.exports = {
  async getChannelVideos(source, limit, options) {
    if (!source.channel_id) {
      return []
    }

    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${source.channel_id}`)
    const videos = []

    for (const item of feed.items.slice(0, limit)) {
      const videoId = getVideoId(item)

      if (!videoId) {
        continue
      }

      videos.push({
        player: 'youtube',
        id: videoId,
        title: item.title,
        pubDate: new Date(item.isoDate || item.pubDate).getTime(),
        thumbnails: getThumbnails(videoId)
      })
    }

    return videos
  }
}
