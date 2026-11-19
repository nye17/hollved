/**
 * Loads a multi-tracer graph from the data server.
 */

import config from '../../config.js';
import request from './request.js';
import appEvents from './appEvents.js';

export default loadGraph;

async function loadGraph(name, progress) {
  var manifestPromise = request(config.dataUrl + name + '/manifest.json', { responseType: 'json' });
  var radarPromise = config.enableRadar ? fetchRadar() : Promise.resolve();
  var [manifest] = await Promise.all([manifestPromise, radarPromise]);

  var tracerIds = manifest.tracers;
  if (config.tracerAllowlist && config.tracerAllowlist.length) {
    tracerIds = tracerIds.filter(function(tracerId) {
      return config.tracerAllowlist.indexOf(tracerId) >= 0;
    });
  }

  if (!tracerIds.length) {
    throw new Error(
      'No requested tracers found in ' + name + '/manifest.json. Requested: ' +
      (config.tracerAllowlist || []).join(',')
    );
  }

  var tracers = await Promise.all(tracerIds.map(function(tracerId) {
    return loadTracerData(config.dataUrl + name + '/' + tracerId, tracerId, name, progress);
  }));

  appEvents.positionsDownloaded.fire(tracers);
  appEvents.tracerRangesReady.fire(tracers.map(function(t) {
    return { id: t.id, name: t.name, color: t.color, count: t.totalCount || t.count };
  }));

  // Do not block first interactivity on the remaining mobile chunks.
  tracers.forEach(function(t) {
    if (typeof t.loadRemaining === 'function') {
      t.loadRemaining().catch(function(err) {
        console.warn('Background tracer refinement stopped:', err);
      });
    }
  });

  if (config.enableDensities && manifest.densities) {
    appEvents.densitiesReady.fire(Object.assign({}, manifest.densities, { footprint: manifest.footprint || [] }));
  }
}

async function fetchRadar() {
  try {
    var data = await request(config.dataUrl + 'aux/radar.json', { responseType: 'json' });
    appEvents.radarReady.fire(data);
  } catch (_) {
    appEvents.radarReady.fire({ ring: [], sphere: [], hud: null });
  }
}

async function loadTracerData(endpoint, tracerId, graphName, progress) {
  var meta = {};
  try {
    meta = await request(endpoint + '/meta.json', { responseType: 'json' }) || {};
  } catch (_) { /* meta.json is optional */ }

  if (Array.isArray(meta.chunks) && meta.chunks.length) {
    return loadChunkedTracerData(endpoint, tracerId, graphName, meta, progress);
  }

  var expectedBytes = meta.count ? meta.count * 3 * 2 : null;
  var buffer = await request(endpoint + '/positions.bin', {
    responseType: 'arraybuffer',
    progress: reportProgress(graphName + '/' + tracerId, progress, expectedBytes)
  });

  return makeTracer(meta, tracerId, buffer, false);
}

async function loadChunkedTracerData(endpoint, tracerId, graphName, meta, progress) {
  var firstName = meta.chunks[0];
  var firstBuffer = await requestWithRetry(
    endpoint + '/' + firstName,
    graphName + '/' + tracerId + ' preview',
    progress,
    3
  );

  var first = makeTracer(meta, tracerId, firstBuffer, false);
  first.totalCount = meta.count || null;

  var loadedCount = first.count;
  appEvents.progressiveLoadUpdate.fire({
    loaded: loadedCount,
    total: meta.count || loadedCount,
    chunk: 1,
    chunks: meta.chunks.length
  });

  // WeChat's embedded browser is much more reliable with one small binary
  // transfer at a time than with several concurrent GitHub Pages requests.
  // Keep refining even if one chunk exhausts its retries.
  first.loadRemaining = async function() {
    for (var index = 1; index < meta.chunks.length; ++index) {
      var name = meta.chunks[index];
      try {
        var buffer = await requestWithRetry(
          endpoint + '/' + name,
          graphName + '/' + tracerId + ' detail ' + (index + 1) + '/' + meta.chunks.length,
          function() {},
          5,
          30000
        );
        var chunk = makeTracer(meta, tracerId, buffer, true);
        appEvents.positionsDownloaded.fire([chunk]);
        loadedCount += chunk.count;
        appEvents.progressiveLoadUpdate.fire({
          loaded: loadedCount,
          total: meta.count || loadedCount,
          chunk: index + 1,
          chunks: meta.chunks.length
        });
      } catch (err) {
        console.warn('Skipping stalled BGS detail chunk ' + name + ':', err);
        appEvents.progressiveLoadUpdate.fire({
          loaded: loadedCount,
          total: meta.count || loadedCount,
          chunk: index + 1,
          chunks: meta.chunks.length,
          stalled: true
        });
      }

      // Yield between chunks so the native WeChat browser can paint the newly
      // added GPU buffer before the next network request starts.
      await delay(80);
    }
  };

  return first;
}

async function requestWithRetry(url, label, progress, attempts, timeoutMs) {
  var lastError;
  for (var attempt = 1; attempt <= attempts; ++attempt) {
    try {
      return await request(url, {
        responseType: 'arraybuffer',
        timeout: timeoutMs || 12000,
        progress: reportProgress(label, progress, null)
      });
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await delay(250 * attempt);
      }
    }
  }
  throw lastError;
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function makeTracer(meta, tracerId, buffer, append) {
  return {
    id:        meta.id    || tracerId,
    name:      meta.name  || tracerId,
    color:     parseColor(meta.color || '0xffffffff'),
    count:     Math.floor(buffer.byteLength / 6),
    positions: new Uint16Array(buffer),
    append:    append
  };
}

function parseColor(colorStr) {
  if (typeof colorStr === 'number') return colorStr;
  return parseInt(String(colorStr).replace(/^0x/i, ''), 16);
}

function reportProgress(name, progress, expectedBytes) {
  return function(e) {
    var progressInfo = { message: name + ' loading' };
    var total = e.total || expectedBytes;
    if (total) {
      progressInfo.completed = Math.round(e.loaded / total * 100) + '%';
    } else {
      progressInfo.completed = Math.round(e.loaded / 1e6 * 10) / 10 + ' MB';
    }
    progress(progressInfo);
  };
}
