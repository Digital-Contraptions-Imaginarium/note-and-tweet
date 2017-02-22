const
    argv = require("yargs")
        .alias('h', 'hashtag')
        .alias('i', 'interval')
        .alias('p', 'prefix')
        .alias('r', 'regexp')
        .default('interval', 60)
        .default('regexp', "^x ")
        .argv,
    async = require("async"),
    BitlyAPI = require("node-bitlyapi"),
    fs = require("fs-extra"),
    request = require("request"),
    Twitter = require("twitter"),
    _ = require("underscore");

const CHECK_INTERVAL = parseInt(argv.i) * 1000,
      TWEET_MARKING_REGEXP = (argv.regexp && !argv.prefix) ? new RegExp(argv.regexp) : new RegExp("^" + argv.prefix.trim() + " "),
      HASHTAGS = [ ].concat(argv.h).map(h => h.replace(/^#/i, ""));

const twitter = new Twitter({
    "consumer_key": process.env.TWITTER2RSS_CONSUMER_KEY,
    "consumer_secret": process.env.TWITTER2RSS_CONSUMER_SECRET,
    "access_token_key": process.env.TWITTER2RSS_ACCESS_TOKEN_KEY,
    "access_token_secret": process.env.TWITTER2RSS_ACCESS_TOKEN_SECRET
});

let Bitly = null;
if (process.env.BITLY_CLIENT_ID && process.env.BITLY_CLIENT_SECRET) {
    Bitly = new BitlyAPI({
        client_id: process.env.BITLY_CLIENT_ID,
        client_secret: process.env.BITLY_CLIENT_SECRET
    });
    Bitly.setAccessToken(process.env.BITLY_ACCESS_TOKEN);
}

let previousTweets = [ ];

let readSource = (uri, callback) => {
    if (uri.match(/^https?:\/\//i)) {
        let resourceUri = uri.match(/\/d\/([A-Za-z0-9\-]{44})\//);
        request.get({
                "url": "https://docs.google.com/document/d/" + resourceUri[1] + "/export?format=txt"
            }, (err, response, body) => {
                if (err) { console.error(err); return process.exit(1); }
                callback(null, body);
            });
    } else {
        fs.readFile(uri, { "encoding": "utf8" }, (err, contents) => {
            if (err) { console.error(err); return process.exit(1); }
            processSource(contents);
        });
    }
}

let shortenUrl_non_memoized = (url, customDomain, callback) => {
    if (!callback) { callback = customDomain; customDomain = null; }
    if (!Bitly) return callback(null, url);
    Bitly.shorten({ longUrl: url }, (err, results) => {
        if (err) { console.error(err); return process.exit(1); }
        results = JSON.parse(results);
        callback(err, customDomain ? customDomain.replace(/\/$/, "") + "/" + results.data.hash : results.data.url);
    });
}

let shortenUrl = async.memoize(shortenUrl_non_memoized);

let shortenAllUrls = (text, bitlyDomain, callback) => {
    if (!callback) { callback = bitlyDomain; bitlyDomain = null; }
    // from http://stackoverflow.com/a/8234912/1218376
    const URL_REGEXP = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g;
    if (!text.match(URL_REGEXP)) return callback(null, text);
    async.eachSeries(text.match(URL_REGEXP).filter(u => !bitlyDomain || (bitlyDomain && !u.match(new RegExp("^" + bitlyDomain)))), (urlToReplace, callback) => {
        shortenUrl(urlToReplace, bitlyDomain, (err, shortenedUrl) => {
            text = text.replace(urlToReplace, shortenedUrl);
            callback(null);
        });
    }, err => { callback(err, text); });
}

let checkChanges = () => {
    console.error(new Date().toISOString() + ",checking for new content...");
    readSource(argv._[0], (err, contents) => {
        if (err) { console.error(err); return process.exit(1); }
        let tweetCandidates = contents
                .split("\n")
                .map(line => line.trim())
                .reduce((memo, line) => {
                    if (!line.match(TWEET_MARKING_REGEXP)) return memo;
                    line = line.replace(TWEET_MARKING_REGEXP, "").trim();
                    line = HASHTAGS.reduce((memo, h) => memo += (" #" + h), line);
                    return memo.concat(line);
                }, [ ]);
        async.map(tweetCandidates, (tweetCandidate, callback) => {
                shortenAllUrls(tweetCandidate, argv.bitlyprefix, callback);
            }, (err, results) => {
            tweetCandidates = results
                .filter(line => line.length <= 140);
            let newTweets = _.difference(tweetCandidates, previousTweets);
            if (newTweets.length === 0) return setTimeout(checkChanges, CHECK_INTERVAL);
            console.error(new Date().toISOString() + ",tweeting: " + newTweets[0]);
            twitter.post('statuses/update', { status: newTweets[0] }, (err, tweet, response) => {
                if (err) { console.error(err); return process.exit(1); }
                console.error(new Date().toISOString() + ",done.");
                previousTweets.push(newTweets[0]);
                setTimeout(checkChanges, CHECK_INTERVAL);
            });
        });
    });
}

// read the existing tweets
console.error(new Date().toISOString() + ",reading any pre-existing tweets...");
twitter.get(
    'statuses/user_timeline',
    { "screen_name": "dicoim",
      "count": 100 },
    (err, results, response) => {
        if (err) { console.error(err); return process.exit(1); }
        // drop retweets and replies and keep the texts only
        previousTweets = results
            .map(r => r.text)
            .filter(t => !t.match(/^rt /i) && !t.match(/^@/));
        console.error(new Date().toISOString() + ",done.");
        // start monitoring for changes
        checkChanges();
});
