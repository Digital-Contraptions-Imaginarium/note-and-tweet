note-and-tweet
==============

It is distracting to take notes during a conference and tweeting about it at the same time. A possible solution is to take notes in the form of tweets, and use some simple markup in the notes to let a script tweet for you the lines of text that are worth sharing. E.g. in the example below, I write my notes in a file called ```notes.txt```. I launch *note-and-tweet* by doing:

```
node nodeandtweet.js notes.txt --interval 30 --hashtag supermario
```

... and then I start taking my notes:

```
22 February, British Library
Participants, @giacecco, Mario, Luigi

- people arrive late
- I am bored
x Mario makes an incredible jump and collects 10 coins in one move!
- This is f-ing fantastic! :-)
```

But the amazement is not over. Instead of a text file, you can use a Google Docs document, e.g.

```
node nodeandtweet.js https://docs.google.com/document/d/1ptnjzbJz1VPqvlrzvpGgBI-7xrM58N2eZLVBX62mWrw/edit --interval 30 --hashtag supermario
```

Note that the Google Docs document must be accessible to anyone at least for reading.

Every 30 seconds, the script will check for changes in the file (remember to save) and if it finds a new line prefixed by an "x" (lower case) and one or more spaces, it will tweet it, adding the specified hashtags at the end. In this case:

```
Mario makes an incredible jump and collects 10 coins in one move! #supermario
```

If the marked line are longer than 140 characters, they will be ignored. Note that you won't get a warning for that (for the time being).

If you re-start the script, the tweets that were already posted will not be posted again.

You can change the prefix by using the ```--prefix``` or ```-p``` arguments. ```-i``` is an alias to ```--interval```, and ```-h``` to ```--hashtag```. You can specify as many hashtags as you like with multiple ```-h```. The default interval is 60 seconds. If more than one tweet is ready between checks, only the top one will be tweeted, and the others postponed to the next check (do you really need more often than every minute?).

If, instead of a prefix, you prefer using a regular expression, you can do it with the ```--regexp``` or ```-r``` argument, e.g. you can specify the marker for lines to be sent as tweets as a " (DICOIM)" postfix, as in the example below. Note how the brackets are escaped, because they're special characters in regexp.

```
node nodeandtweet.js notes.txt --hashtag supermario -r ' \(DICOIM\)$'
```

If you have a Bit.ly account and the following three environment variables are defined: ```BITLY_CLIENT_ID```, ```BITLY_CLIENT_SECRET``` and ```BITLY_ACCESS_TOKEN```, then any URL found in the tweets will be shortened using it. The ```--bitlyprefix``` argument allows you to override the domain returned by Bit.ly with any domain you specify, e.g. from http://bit.ly/2kLlPGO to https://dico.im/2kLlPGO .
