const request = require('request');
const rp = require('request-promise');

function errorFound(res, errorMessage) {
    res.statusCode = 400;
    res.send({success: false, message: errorMessage});
}

function extractCardShortLinks(string) {
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

function findCards(message) {

    let shortLinks = [];
    let tail = message;

    while (tail !== undefined) {
        const result = extractCardShortLinks(tail);
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

function pushAttachement(attachmentUrl, shortLink, key, token) {
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
        body: { url: attachmentUrl },
        json: true 
    };

    rp(fetchCardAttchmentsOptions)
        .then(function (body){

            const attachmentUrls = body.map( attachment => {
                return attachment.url;
            });

            const filteredAttachmentUrls = attachmentUrls.filter( url => {
                return url === attachmentUrl
            });

            if (filteredAttachmentUrls.length == 0) {
                rp(postCommitOptions)
                .then(function (body) {
                    console.log(`Successfully attached ${attachmentUrl} to https://trello.com/c/${shortLink}/`);
                })
                .catch(function (err) {
                    console.log(err);
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

function attachCommitsToCards(res, commits, key, token) {
    commits.forEach(function(commit) {
        const cards = findCards(commit.message);
        cards.forEach(function(shortLink) {
            const commitUrl = commit.links.html.href;
            pushAttachement(commitUrl, shortLink, key, token);

        })
    });
}

function attachPRTocards(res, cards, link, key, token) {
    cards.forEach( shortLink => {
        pushAttachement(link, shortLink, key, token);
    });
}

function moveCard(res, shortLink, destinationList, key, token) {
    const cardUri = `https://api.trello.com/1/cards/${shortLink}/`

    const getCardOptions = {
        method: 'GET',
        uri: cardUri,
        qs: { key: key, token: token },
        json: true
    };

    rp(getCardOptions)
    .then(body => {
        const idBoard = body.idBoard;
        const boardListUri = `https://api.trello.com/1/boards/${idBoard}/lists/`

        const getBoardOptions = {
            method: 'GET',
            uri: boardListUri,
            qs: { key: key, token: token },
            json: true
        };

        rp(getBoardOptions)
        .then(body => {
            filteredLists = body.filter(list => {
                return list.name === destinationList
            });
            if (filteredLists.length > 0) {
                const destinationListId = filteredLists[0].id;

                const cardListUri = `https://api.trello.com/1/cards/${shortLink}/idList/`;
                const putCardListOptions = {
                    method: 'PUT',
                    uri: cardListUri,
                    qs: { key: key, token: token },
                    body: { value: destinationListId},
                    json: true
                };

                rp(putCardListOptions)
                .then(body => {
                    console.log(`Successfully moved https://trello.com/c/${shortLink}/ on ${destinationList}`);
                })
                .catch(err => {
                    console.log(err);
                });
            }
        })
        .catch(err => {
            console.log(err);
        });
    })
    .catch(err => {
        console.log(err);
    });
}

function moveCards(res, cards, state, branch, query, key, token) {
    let queryKeyRoot = '';
    if (state === 'OPEN') {
        queryKeyRoot = 'destListNameOpenPR_';
    } else if (state === 'MERGED') {
        queryKeyRoot = 'destListNameMergePR_';
    } else {
        return;
    }

    const destinationList = query[queryKeyRoot + branch];
    if (destinationList === undefined) {
        return;
    }

    cards.forEach( shortLink => {
        moveCard(res, shortLink, destinationList, key, token);
    });
}

function processCommits(req, res) {
    const commits = req.body.push.changes[0].commits;
    if (commits === undefined) {
        errorFound(res, "No commits found");
    }

    const key = req.query.key;
    if (key === undefined) {
        errorFound(res, "Trello API Key is needed in the query parameters");
    }

    const token = req.query.token;
    if (token === undefined) {
        errorFound(res, "Trello authetification Token is needed in the query parameters");
    }

    attachCommitsToCards(res, commits, key, token);
}

function processPR(req, res) {
    const description = req.body.pullrequest.description
    if (description === undefined) {
        errorFound(res, "No description found in that pull request");
    }

    const link = req.body.pullrequest.links.html.href;
    if (link === undefined) {
        errorFound(res, "No PR link found.");
    }

    const state = req.body.pullrequest.state;
    if (state === undefined) {
        errorFound(res, "No state found");
    }

    const branch = req.body.pullrequest.destination.branch.name;
    if (branch === undefined) {
        errorFound(res, "No branch found");
    }

    const key = req.query.key;
    if (key === undefined) {
        errorFound(res, "Trello API Key is needed in the query parameters");
    }

    const token = req.query.token;
    if (token === undefined) {
        errorFound(res, "Trello authetification Token is needed in the query parameters");
    }

    const cards = findCards(description);
    attachPRTocards(res, cards, link, key, token);
    moveCards(res, cards, state, branch, req.query, key, token);
}

module.exports = {

    process(req, res, next) {
        [{ try: processCommits, catch: "No commits found"},
         { try: processPR,      catch: "No pull request found" }]
        .forEach( p => {
            try {
                p.try(req, res);
                activity = true;
            } catch (err) {
                console.log(p.catch);
            }
        });
        
        res.send({success: true});
    }
    
}