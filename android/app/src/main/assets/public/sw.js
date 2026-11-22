/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "17983003878fe81e5c8e37792fe8ddde"
  }, {
    "url": "pwa-512x512.png",
    "revision": "577c4607b16164322e59cae31b44506f"
  }, {
    "url": "pwa-192x192.png",
    "revision": "8c0415da7814e5d287b7cc35485bc0f5"
  }, {
    "url": "logo.svg",
    "revision": "ac4ac0e28769f52f418a45cbc5eafda5"
  }, {
    "url": "index.html",
    "revision": "33501919148338a8dad27084c037b228"
  }, {
    "url": "icon.svg",
    "revision": "ac4ac0e28769f52f418a45cbc5eafda5"
  }, {
    "url": "favicon.png",
    "revision": "dfe2f6998947df259c2132e432f18818"
  }, {
    "url": "favicon.ico",
    "revision": "ffd496d30bc4dcd77581fd8f47d6cd34"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d8a510d9b76439801c6a6c5df2eb33a4"
  }, {
    "url": "assets/index-DRujhZYe.css",
    "revision": null
  }, {
    "url": "assets/index-D8iz746U.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d8a510d9b76439801c6a6c5df2eb33a4"
  }, {
    "url": "favicon.ico",
    "revision": "ffd496d30bc4dcd77581fd8f47d6cd34"
  }, {
    "url": "favicon.png",
    "revision": "dfe2f6998947df259c2132e432f18818"
  }, {
    "url": "icon.svg",
    "revision": "ac4ac0e28769f52f418a45cbc5eafda5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "8c0415da7814e5d287b7cc35485bc0f5"
  }, {
    "url": "pwa-512x512.png",
    "revision": "577c4607b16164322e59cae31b44506f"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "17983003878fe81e5c8e37792fe8ddde"
  }, {
    "url": "manifest.webmanifest",
    "revision": "bdb5d44b5ac3f9bd643baa3b9a79f5cf"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
