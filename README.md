# Car Talk Public Archive Downloader — Improved!

This is a fixed/improved fork of an old archived github project that helps download old episodes of this fantastic NPR radio show. Beyond fixes, the biggest improvement is that it now uses the episode number and title for the file names, since the names from the server are just random strings. 

It's unfortunate that NPR now limits the number of past episodes in their podcast XML, but this is a solid workaround. My changes aren't beautifully architected or anything, but they work! It skips duplicates, so you can technically run it again when new episodes are released (but really, I'd **strongly recommend** just using the podcast feed for "new" episodes instead of hammering the website like this.)  

If you have issues, the `--show-browser` option can be helpful. There are also options for retry interval, max attempts, detailed logging, etc. in the settings.json. (Assuming NPR's page hasn't changed significantly, in which case you'd have to inspect it and modify the puppeteer code accordingly.) Feel free to report an issue if you experience problems and I'll try to get you fixed up.

# [Original project's description follows - Read it!]
# Before running... please read

As with any tool that helps automate tasks you would have done anyways, please use reasonably. As far as [NPR's Terms of Service reads](https://www.npr.org/about-npr/179876898/terms-of-use), you may only use this for personal and noncommercial use to retrieve the Car Talk episodes you would have downloaded for yourself anyways. This tool does not leverage NPR's APIs, so it *should* not fall under the API Content TOS. If you really enjoy Car Talk, think about [supporting NPR](https://www.npr.org/support) by [buying some swag](https://shop.npr.org/) and/or by [making a donation](https://www.npr.org/donations/support).

### How to install and use

1. Install [node](https://nodejs.org/en/).
2. From a command prompt, install this globally with `npm install -g cartalk-auto-downloader`.
3. Type `cartalkad` in a command prompt and hit enter. Further instructions will print out 😊

### Why did I make this?

![A random sunrise picture from Feb 2011](./docs/assets/SomeSunriseFrom2011.jpg)

Long story short, a friend of mine asked me if it was possible to do something like this. I remembered listening to Car Talk years ago (back when there was more time for adventures), and the nostalgia immediately drew me in. 

(...while it is true that I would have done this regardless of podcast, I'm always open to a good excuse for a new project that I might be able to finish 😀)

### What is this?

A tool to help click a bunch of download buttons with only your keyboard! It is an... auto downloader 🤔  

## Developing

Follow the steps below if you want to use this.

### Prerequisites

* Install [node & npm](https://www.npmjs.com/get-npm)
* Install Typescript (`npm install -g typescript`)

### To use CLI in development

1. `npm run build`
2. `npm link` (only need to do this once)

## Further Reading

* https://codeburst.io/how-to-build-a-command-line-app-in-node-js-using-typescript-google-cloud-functions-and-firebase-4c13b1699a27
* https://github.com/tj/commander.js/
* https://itnext.io/how-to-create-your-own-typescript-cli-with-node-js-1faf7095ef89
* https://benbernardblog.com/web-scraping-and-crawling-are-perfectly-legal-right/
* https://blog.npmjs.org/post/118810260230/building-a-simple-command-line-tool-with-npm
