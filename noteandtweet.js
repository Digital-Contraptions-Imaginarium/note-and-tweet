const
    argv = require("yargs")
        .alias('h', 'hashtag')
        .alias('i', 'interval')
        .alias('p', 'prefix')
        .default('i', 60)
        .default('p', "x")
        .argv,
    async = require("async"),
    fs = require("fs-extra"),
    Twitter = require("twitter"),
    _ = require("underscore");

const CHECK_INTERVAL = parseInt(argv.i) * 1000,
      COMPLETED_TWEETS_PREFIX = argv.p.trim() + " ",
      HASHTAGS = [ ].concat(argv.h).map(h => h.replace(/^#/i, ""));

const twitter = new Twitter({
    "consumer_key": process.env.TWITTER2RSS_CONSUMER_KEY,
    "consumer_secret": process.env.TWITTER2RSS_CONSUMER_SECRET,
    "access_token_key": process.env.TWITTER2RSS_ACCESS_TOKEN_KEY,
    "access_token_secret": process.env.TWITTER2RSS_ACCESS_TOKEN_SECRET
});

let previousTweets = [ ],
    completed_tweets_regexp = new RegExp("^" + COMPLETED_TWEETS_PREFIX, "i");

let checkChanges = () => {
    console.error(new Date().toISOString() + ",checking for new content...");
    fs.readFile(argv._[0], { "encoding": "utf8" }, (err, contents) => {
        if (err) { console.error(err); return process.exit(1); }
        let tweetCandidates = contents
                .split("\n")
                .reduce((memo, line) => {
                    if (!line.match(completed_tweets_regexp)) return memo;
                    line = line.replace(completed_tweets_regexp, "").trim();
                    line = HASHTAGS.reduce((memo, h) => memo += (" #" + h), line);
                    return memo.concat(line);
                }, [ ])
                .filter(line => line.length <= 140),
            newTweets = _.difference(tweetCandidates, previousTweets);
        if (newTweets.length === 0) return setTimeout(checkChanges, CHECK_INTERVAL);
        console.error(new Date().toISOString() + ",tweeting: " + newTweets[0]);
        twitter.post('statuses/update', { status: newTweets[0] }, (err, tweet, response) => {
            if (err) { console.error(err); return process.exit(1); }
            previousTweets.push(newTweets[0]);
            setTimeout(checkChanges, CHECK_INTERVAL);
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
        // start monitoring for changes
        checkChanges();
});
