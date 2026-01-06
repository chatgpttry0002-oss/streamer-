import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// VIDEO SOURCES - STORED ONLY ON SERVER
// These URLs are NEVER exposed to the frontend
// ============================================
const VIDEO_SOURCES = {
  "1": {
    title: "BUCKCHODI Official Video BALI ENZO",
    description: "Official music video in stunning 1080P HD quality",
    thumbnail: "https://img.lulucdn.com/24aafkf8kfvs_t.jpg",
    duration: "02:48",
    year: "2024",
    videoId: "24aafkf8kfvs"
  },
  "2": {
    title: "Ocean Dreams",
    description: "Dive into the deep blue sea and discover marine wonders",
    thumbnail: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80",
    duration: "03:45",
    year: "2024",
    videoId: "24aafkf8kfvs"
  },
  "3": {
    title: "Mountain Peaks",
    description: "Conquer the highest summits with extreme adventurers",
    thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    duration: "04:12",
    year: "2023",
    videoId: "24aafkf8kfvs"
  },
  "4": {
    title: "Urban Nights",
    description: "City lights and nightlife from around the world",
    thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
    duration: "03:58",
    year: "2024",
    videoId: "24aafkf8kfvs"
  },
  "5": {
    title: "Forest Whispers",
    description: "Ancient trees and hidden paths in mystical forests",
    thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    duration: "05:17",
    year: "2023",
    videoId: "24aafkf8kfvs"
  },
  "6": {
    title: "Desert Storm",
    description: "Sand dunes and endless horizons of the Sahara",
    thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80",
    duration: "04:55",
    year: "2024",
    videoId: "24aafkf8kfvs"
  }
};

// Cache for video URLs
const videoUrlCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  extensions: ['html', 'htm']
}));

// API endpoint to get video metadata (without actual URLs)
app.get('/api/videos', (req, res) => {
  const safeVideos = {};
  for (const [id, video] of Object.entries(VIDEO_SOURCES)) {
    safeVideos[id] = {
      id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      duration: video.duration,
      year: video.year
    };
  }
  res.json(safeVideos);
});

// Function to get video URL from luluvid
async function getVideoUrl(videoId) {
  // Check cache first
  const cached = videoUrlCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached video URL for:', videoId);
    return cached.url;
  }

  try {
    // Fetch the embed page to extract video URL
    const embedUrl = `https://luluvid.com/e/${videoId}`;
    console.log('Fetching embed page:', embedUrl);

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://luluvid.com/',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch embed page: ${response.status}`);
    }

    const html = await response.text();
    let videoUrl = null;

    // Pattern 1: Look for sources array with file property
    const sourcesMatch = html.match(/sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/i);
    if (sourcesMatch) {
      videoUrl = sourcesMatch[1];
      console.log('Found via sources array:', videoUrl);
    }

    // Pattern 2: Look for file: "url" pattern
    if (!videoUrl) {
      const fileMatch = html.match(/file:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (fileMatch) {
        videoUrl = fileMatch[1];
        console.log('Found via file pattern:', videoUrl);
      }
    }

    // Pattern 3: Look for src in source tag
    if (!videoUrl) {
      const srcMatch = html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)["']/i);
      if (srcMatch) {
        videoUrl = srcMatch[1];
        console.log('Found via source tag:', videoUrl);
      }
    }

    // Pattern 4: Look for video URL in any script
    if (!videoUrl) {
      const scriptMatch = html.match(/["'](https?:\/\/[^"']*\.mp4[^"']*)["']/i);
      if (scriptMatch) {
        videoUrl = scriptMatch[1];
        console.log('Found via script pattern:', videoUrl);
      }
    }

    // Pattern 5: Look for m3u8 playlist
    if (!videoUrl) {
      const m3u8Match = html.match(/["'](https?:\/\/[^"']*\.m3u8[^"']*)["']/i);
      if (m3u8Match) {
        videoUrl = m3u8Match[1];
        console.log('Found m3u8:', videoUrl);
      }
    }

    // Pattern 6: Try CDN patterns based on video ID
    if (!videoUrl) {
      const cdnPatterns = [
        `https://m3.lulucdn.com/${videoId}.mp4`,
        `https://v.lulucdn.com/${videoId}.mp4`,
        `https://cdn.lulucdn.com/${videoId}.mp4`,
        `https://s1.lulucdn.com/${videoId}.mp4`,
        `https://stream.lulucdn.com/${videoId}.mp4`
      ];

      for (const pattern of cdnPatterns) {
        try {
          console.log('Trying CDN pattern:', pattern);
          const testResponse = await fetch(pattern, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://luluvid.com/'
            }
          });
          if (testResponse.ok || testResponse.status === 206) {
            videoUrl = pattern;
            console.log('Found working CDN URL:', videoUrl);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    // Pattern 7: Extract from packed/eval JavaScript
    if (!videoUrl) {
      const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)[^)]+\)/gs);
      if (evalMatch) {
        for (const packed of evalMatch) {
          const urlMatch = packed.match(/https?:[\\\/]+[^"'\s]+\.mp4/i);
          if (urlMatch) {
            videoUrl = urlMatch[0].replace(/\\/g, '');
            console.log('Found in eval:', videoUrl);
            break;
          }
        }
      }
    }

    if (videoUrl) {
      // Clean up URL
      videoUrl = videoUrl.replace(/\\/g, '');
      
      // Cache it
      videoUrlCache.set(videoId, {
        url: videoUrl,
        timestamp: Date.now()
      });
      
      return videoUrl;
    }

    console.log('Could not extract video URL. Page content sample:', html.substring(0, 2000));
    return null;

  } catch (error) {
    console.error('Error getting video URL:', error.message);
    return null;
  }
}

// Stream endpoint
app.get('/stream', async (req, res) => {
  const videoId = req.query.id;
  
  if (!videoId || !VIDEO_SOURCES[videoId]) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const luluVideoId = VIDEO_SOURCES[videoId].videoId;
  
  try {
    const videoUrl = await getVideoUrl(luluVideoId);
    
    if (!videoUrl) {
      console.error('Could not get video URL for:', luluVideoId);
      return res.status(500).json({ error: 'Could not retrieve video' });
    }

    console.log('Streaming video:', videoId, '-> URL obtained');

    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Referer': 'https://luluvid.com/',
      'Origin': 'https://luluvid.com'
    };

    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(videoUrl, { headers });

    if (!response.ok && response.status !== 206) {
      console.error('Video fetch failed:', response.status, response.statusText);
      return res.status(response.status).json({ error: 'Stream failed' });
    }

    // Forward headers
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges || 'bytes');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
      res.status(206);
    } else {
      res.status(response.status);
    }

    // Pipe stream
    response.body.pipe(res);

    req.on('close', () => {
      if (response.body) {
        response.body.destroy();
      }
    });

  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Stream failed' });
  }
});

// Iframe embed endpoint (alternative method)
app.get('/embed/:id', (req, res) => {
  const videoId = req.params.id;
  
  if (!VIDEO_SOURCES[videoId]) {
    return res.status(404).send('Video not found');
  }

  const luluVideoId = VIDEO_SOURCES[videoId].videoId;
  const embedUrl = `https://luluvid.com/e/${luluVideoId}`;
  
  // Return a page that embeds the video
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Player</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; }
        iframe { width: 100vw; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${embedUrl}" allowfullscreen allow="autoplay; fullscreen"></iframe>
    </body>
    </html>
  `);
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 StreamVault running on port ${PORT}`);
  console.log(`📺 Dashboard: http://localhost:${PORT}`);
});