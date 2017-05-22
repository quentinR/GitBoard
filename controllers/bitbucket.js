const request = require('request');

function errorFound(res, errorMessage) {
    res.statusCode = 400;
    res.send({success: false, message: errorMessage});
}

function parse(string) {
        // Trello URL are type of https://trello.com/b/[SHORT_LINK]]/[CARD_NAME]
        const baseTrelloUrl = 'trello.com/';
        if (string.includes(baseTrelloUrl)) {

            const startIndex = string.indexOf(baseTrelloUrl) + baseTrelloUrl.length + 'b/'.length;
            var endIndex = startIndex + 1;
            while (endIndex < string.length && string.substring(endIndex, endIndex + 1) != '/') {
                var endIndex = endIndex + 1;
            }

            return { shortLink: string.substring(startIndex, endIndex),
                     tail: string.substring(endIndex, string.length-1) };
        }
}

function extractCardShortLinks(message) {

    let shortLinks = [];
    let tail = message;

    while (tail !== undefined) {
        const result = parse(tail);
        if (result === undefined) {
            break;
        }

        const shortLink = result.shortLink;
        tail = result.tail;

        if (shortLink !== undefined) {
            shortLinks.push(shortLink);
        }
    }

    return shortLinks;
}

function pushCommit(commit, shortLink, key, token) {
    const commitUrl = commit.links.html.href;
    if (commitUrl === undefined) {
        return
    }

    request.post(`https://api.trello.com/1/cards/${shortLink}/attachments?key=${key}&token=${token}`,
    { json: { url: commitUrl } },
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    });
}

function runQuery(res, commits, key, token) {
    var responseBody = []
    commits.forEach(function(commit) {
        const shortLinks = extractCardShortLinks(commit.message);
        shortLinks.forEach(function(shortLink) {
            pushCommit(commit, shortLink, key, token);
        })
    });
    // if (shortLinks.length > 0) {
        res.send({success: true});
    // } else {
        // res.send({success: false, message: "No Trello card short link found in the commit messages."});
    // }
}

module.exports = {

    postCommits(req, res, next) {
        const commits = req.body.push.changes[0].commits;
        if (commits === undefined) {
            errorFound(res, "No commits found");
        }

        const key = req.query.key;
        if (key === undefined) {
            errorFound(res, "Trello API Key is needed in the query parameters")
        }

        const token = req.query.token;
        if (token === undefined) {
            errorFound(res, "Trello authetification Token is needed in the query parameters")
        }

        runQuery(res, commits, key, token);
    }
}