const {findCardsShortLinks, attachCommitsToCards, attachPRTocards, moveCards} = require('./trello');
const {errorFound} = require('./utils');

function processCommits(req, res) {
    const {commits} = req.body.push.changes[0];
    if (commits === undefined) {
        errorFound({res, message: "No commits found"});
    }

    const {key, token} = req.query;
    if (key === undefined) {
        errorFound({res, message: "Trello API Key is needed in the query parameters"});
    }
    if (token === undefined) {
        errorFound({res, message: "Trello authetification Token is needed in the query parameters"});
    }

    attachCommitsToCards({res, commits, key, token});
}

function processPR(req, res) {
    const link = req.body.pullrequest.links.html.href;
    if (link === undefined) {
        errorFound({res, message: "No PR link found."});
    }

    const {description, state} = req.body.pullrequest;
    if (description === undefined) {
        errorFound({res, message: "No description found in that pull request"});
    }
    if (state === undefined) {
        errorFound({res, message: "No state found"});
    }

    const branch = req.body.pullrequest.destination.branch.name;
    if (branch === undefined) {
        errorFound({res, message: "No branch found"});
    }

    const {key, token} = req.query;
    if (key === undefined) {
        errorFound({res, message: "Trello API Key is needed in the query parameters"});
    }
    if (token === undefined) {
        errorFound({res, message: "Trello authetification Token is needed in the query parameters"});
    }

    const cards = findCardsShortLinks({message: description});
    attachPRTocards({res, cards, link, key, token});
    moveCards({res, cards, state, branch, query: req.query, key, token})
}

module.exports = {

    processBitbucketHook(req, res, next) {
        [{ try: processCommits, catch: "No commits found"},
         { try: processPR,      catch: "No pull request found" }]
        .forEach( p => {
            try {
                p.try(req, res);
            } catch (err) {
                console.log(p.catch);
            }
        });
        
        res.send({success: true});
    }
    
}