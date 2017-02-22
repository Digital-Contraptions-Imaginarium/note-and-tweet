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

Every 30 seconds, the script will check for changes in the file (remember to save) and if it finds a new line prefixed by an "x" and one or more spaces, it will tweet it, adding the specified hashtags at the end. In this case:

If you re-start the script, the tweets that were already posted will not be posted again

```
Mario makes an incredible jump and collects 10 coins in one move! #supermario
```

You can change the prefix by using the ```--prefix``` or ```-p``` arguments. ```-i``` is an alias to ```--interval```, and ```-h``` to ```--hashtag```. The default interval is 60 seconds. If more than one tweet is ready between checks, only the top one will be tweeted, and the others postponed to the next check (do you really need more often than every minute?).
