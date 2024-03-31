# Codestrates 2

Codestrates builds on [Webstrates](http://webstrates.net). A web-page served from a Webstrates server is called a _webstrate_, and is a web-page where changes to the document object model (DOM) are persisted to the server and synchronized with other clients of the same page.

## Use

Codestrates v2 can run on any Webstrates server. To setup your own Webstrates server see the [Webstrates documentation](https://webstrates.github.io/gettingstarted/installation.html).

To create an webstrate with the basic Codestrates envionment installed use the prototype ZIP file using the [HTTP API](https://webstrates.github.io/userguide/http-api.html) of Webstrates. The following link creates a copy on the public [demo.webstrates.net](https://demo.webstrates.net/) server:

> https://demo.webstrates.net/new?prototypeUrl=https://github.com/Webstrates/Codestrates-v2/raw/master/prototypes/web.zip

To create a copy on your own server replace the server address with your server:

```
https://your-webstrates-server.com/new?prototypeUrl=https://github.com/Webstrates/Codestrates-v2/raw/master/prototypes/web.zip
```

To overcome potential CORS issues, you can use a CDN:

```
https://your-webstrates-server.com/new?prototypeUrl=https://cdn.jsdelivr.net/gh/Webstrates/Codestrates-v2@master/prototypes/web.zip
```
