# NewsVruva

An editorial news reader for US headlines. Explore seven sections, search the loaded stories, save articles to a browser-local reading list, or discover something unexpected with Surprise me.

Stories open in an in-app preview with the publisher, date, available excerpt, optional read-aloud and focus view, sharing, and a clear link to the publisher's full article. News API provides short excerpts, not full articles.

## Run locally

Use Node.js 20 or newer. Copy `.env.example` to `.env` and add your News API key as `NEWS_API_KEY`. An existing `VITE_APP_NEWS_API_KEY` value also works with the local server, but `NEWS_API_KEY` is preferred because it is never included in a browser build.

```sh
npm install
npm run build
npm start
```

Open http://localhost:5173/. The server serves the built app and forwards news requests to News API with the key in an HTTP header. Successful responses are cached for five minutes to reduce API usage.

For UI review without a News API request, open http://localhost:5173/?preview=1. Example headlines in this mode are labeled as a design preview and do not link to articles.

The fallback cover illustration lives at `public/editorial-cover.png`. It was generated for NewsVruva as a generic editorial collage; it does not depict an actual event.

For hot reload, run `npm run api` in one terminal and `npm run dev` in another. Vite proxies `/api` to the local API server on port 5174.

## Checks

```sh
npm run lint
npm run build
node --check server.mjs
```

The News API Developer plan permits local development and testing; publishing a live news product requires an appropriate News API subscription. See [News API pricing](https://newsapi.org/pricing).
