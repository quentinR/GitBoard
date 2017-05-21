const request = require('request');

function errorFound(res, errorMessage) {
    res.statusCode = 400;
    res.send({success: false, message: errorMessage});
}

function extractCardShortLink(message) {
    // Trello URL are type of https://trello.com/b/[SHORT_LINK]]/[CARD_NAME]
    let baseTrelloUrl = 'trello.com/';
    if (message !== undefined && message.includes(baseTrelloUrl)) {

        const startIndex = message.indexOf(baseTrelloUrl) + baseTrelloUrl.length + 'b/'.length
        var endIndex = startIndex + 1;
        while (endIndex < message.length && message.substring(endIndex, endIndex + 1) != '/') {
            var endIndex = endIndex + 1;
        }

        return message.substring(startIndex, endIndex)
    }
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
            console.log(body)
        }
    });
}

function runQuery(res, commits, key, token) {
    var shortLinks = []
    commits.forEach(function(commit) {
        const shortLink = extractCardShortLink(commit.message)
        if (shortLink !== undefined) {
            shortLinks.push(shortLink)
            pushCommit(commit, shortLink, key, token)
        }
    });
    if (shortLinks.length > 0) {
        res.send({success: true, trello_card_shortLinks: shortLinks})
    } else {
        res.send({success: false, message: "No Trello card short link found in the commit messages."});
    }
}

module.exports = {

    postCommits(req, res, next) {
        const commits = req.body.push.changes[0].commits;
        if (commits === undefined) {
            errorFound(res, "No commits found");
        }

        const key = req.query.key
        if (key === undefined) {
            errorFound(res, "Trello API Key is needed in the query parameters")
        }

        const token = req.query.token
        if (token === undefined) {
            errorFound(res, "Trello authetification Token is needed in the query parameters")
        }

        runQuery(res, commits, key, token)
    }
}