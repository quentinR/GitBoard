const request = require('request');
const rp = require('request-promise');

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

        if (shortLink !== undefined && shortLinks.indexOf(shortLink) < 0) {
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

    const uri = `https://api.trello.com/1/cards/${shortLink}/attachments`

    const fetchCardAttchmentsOptions = {
        method: 'GET',
        uri: uri,
        qs: { key: key, token: token },
        json: true
    };
    
    const postCommitOptions = {
        method: 'POST',
        uri: uri,
        qs: { key: key, token: token },
        body: { url: commitUrl },
        json: true 
    };

    rp(fetchCardAttchmentsOptions)
        .then(function (body){

            const attachmentUrls = body.map( attachment => {
                return attachment.url;
            });

            const commitUrls = attachmentUrls.filter( url => {
                return url === commitUrl
            });

            if (commitUrls.length == 0) {
                rp(postCommitOptions)
                .then(function (body) {
                    return { succeed: body }
                })
                .catch(function (err) {
                    return { failed: err}
                });
            }
        })
        .catch(function (err) {
            return { failed: err}
        });
}

function runQuery(res, commits, key, token) {
    let body = {
        success: [],
        faillures: []
    }
    commits.forEach(function(commit) {
        const shortLinks = extractCardShortLinks(commit.message);
        shortLinks.forEach(function(shortLink) {
            const result = pushCommit(commit, shortLink, key, token);
            if (result !== undefined) {
                const succeed = result.succeed
                const failed = result.failed

                if (failed !== undefined) {
                    body.faillures.push(failed)
                } else if (succeed !== undefined) {
                    body.success.push(succeed)
                }
            }
        })
    });
    commitsLinkingSuccessCount = body.success.length
    commitsLinkingFaillureCount = body.faillures.length
    commitsLinkToCardFoundCount = commitsLinkingSuccessCount + commitsLinkingFaillureCount
    const status = `${commitsLinkToCardFoundCount} commits linked to a Trello card were found, ${commitsLinkToCardFoundCount} got successfully linked, ${commitsLinkingFaillureCount} failed` 
    res.send({ status: status, details: body });
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