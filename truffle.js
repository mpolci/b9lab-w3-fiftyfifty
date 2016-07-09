module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": [
      "javascripts/app.js"
    ],
    "fiftyfifty.js": [
      "javascripts/fiftyfifty.js"
    ],
    "app.css": [
      "stylesheets/app.css"
    ],
  },
  deploy: [
  ],
  rpc: {
    host: "localhost",
    port: 8545
  }
};
