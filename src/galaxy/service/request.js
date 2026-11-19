/**
 * A very basic ajax client with promises and progress reporting.
 */

export default request;

function request(url, options) {
  if (!options) options = {};

  return new Promise(download);

  function download(resolve, reject) {
    var req = new XMLHttpRequest();

    if (typeof options.progress === 'function') {
      req.addEventListener("progress", updateProgress, false);
    }

    req.addEventListener("load", transferComplete, false);
    req.addEventListener("error", transferFailed, false);
    req.addEventListener("abort", transferCanceled, false);
    req.addEventListener("timeout", transferTimedOut, false);

    req.open('GET', url);
    if (options.responseType) {
      req.responseType = options.responseType;
    }
    if (options.timeout) {
      req.timeout = options.timeout;
    }
    req.send(null);

    function updateProgress(e) {
      options.progress({ loaded: e.loaded, total: e.total });
    }

    function transferComplete() {
      if (req.status !== 200) {
        reject(`Unexpected status code ${req.status} when calling ${url}`);
        return;
      }
      var response = req.response;

      if (options.responseType === 'json' && typeof response === 'string') {
        // IE
        response = JSON.parse(response);
      }

      resolve(response);
    }

    function transferFailed() {
      reject(`Failed to download ${url}`);
    }

    function transferCanceled() {
      reject(`Cancelled download of ${url}`);
    }

    function transferTimedOut() {
      reject(`Timed out downloading ${url}`);
    }
  }
}
