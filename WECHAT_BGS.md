# WeChat DESI BGS build

This branch adds a standalone mobile build intended for use as an H5 page inside a WeChat Mini Program `<web-view>`.

## Build

```bash
npm install
npm run build:wechat-bgs
```

The output is written to:

```text
build-wechat-bgs/
├── index.html
├── app.js
├── styles.css
├── assets/
└── emitted font assets
```

Serve that directory from any HTTPS static host.

## Behaviour

The standalone build:

- opens DESI directly, with the authored BGS camera state;
- downloads only the `bgs` survey tracer from the DESI manifest;
- hides the HOLLVeD home/menu, tracer selector, camera HUD, and exit button;
- keeps the existing orbit/fly controls, help interaction, catalog info, and reset button;
- omits Google Analytics and Google Fonts from the standalone HTML;
- leaves the normal `npm run build` output unchanged.

## Data host

By default the build still uses the upstream data host:

```text
https://hsimonfroy.github.io/hollved-data/
```

For a China-friendly deployment, set the data origin before `app.js` runs:

```html
<script>
  window.HOLLVED_DATA_URL = 'https://your-data-domain.example/';
</script>
<script src="app.js"></script>
```

The URL must end in `/` and preserve the same directory layout as `hollved-data`.

## WeChat Mini Program

After deploying the H5 build to an HTTPS domain configured as a Mini Program 业务域名, the Mini Program page can be only:

```xml
<web-view src="https://your-domain.example/desi-bgs/"></web-view>
```

Keep the Mini Program wrapper separate from this repository so the scientific viewer remains deployable as a normal H5 site.
