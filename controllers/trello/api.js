const request = require('request-promise');
const {findCardsShortLinks} = require('./utils');

const trelloApiBaseUrl = 'https://api.trello.com/1';

function pushAttachement({attachmentUrl, shortLink, key, token}) {
  const uri = `${trelloApiBaseUrl}/cards/${shortLink}/attachments`

  request({
    method: 'GET',
    uri,
    qs: { key, token },
    json: true
  })
  .then(body => {
    const isAlreadyAttached = body.filter( attachment => attachment.url === attachmentUrl).length !== 0;

    if (isAlreadyAttached) {
      throw Error('This commit or PR is already attached to this Trello card.')
    }
  
    return request({
      method: 'POST',
      uri,
      qs: { key, token },
      body: { url: attachmentUrl },
      json: true 
    });
  })
  .then(() => console.log(`Successfully attached ${attachmentUrl} to https://trello.com/c/${shortLink}/`))
  .catch(err => console.log(err));
}

function attachCommitsToCards({res, commits, key, token}) {
  commits.forEach(commit => {
    const cards = findCardsShortLinks({message: commit.message});
    cards.forEach(function(shortLink) {
        const commitUrl = commit.links.html.href;
        pushAttachement({attachmentUrl: commitUrl, shortLink, key, token});
    });
  });
}

function attachPRTocards({res, cards, link, key, token}) {
  cards.forEach( shortLink => {
    pushAttachement({attachmentUrl: link, shortLink, key, token});
  });
}

function moveCard({res, shortLink, destinationList, key, token}) {
  const cardUri = `${trelloApiBaseUrl}/cards/${shortLink}/`

  request({
    method: 'GET',
    uri: cardUri,
    qs: { key, token },
    json: true
  })
  .then(({idBoard}) => {
    const boardListUri = `${trelloApiBaseUrl}/boards/${idBoard}/lists/`

    return request({
      method: 'GET',
      uri: boardListUri,
      qs: { key, token },
      json: true
    })
  })
  .then(body => {
    const destinationListId = (body.filter(list => list.name === destinationList)[0] || {}).id;
    if (!destinationListId) {
      throw Error(`Destination list ${destinationList} is not found in the board ${boardListUri}.`)
    }

    const cardListUri = `${trelloApiBaseUrl}/cards/${shortLink}/idList/`;
    
    return request({
      method: 'PUT',
      uri: cardListUri,
      qs: { key, token },
      body: { value: destinationListId},
      json: true
    })
  })
  .then(() => console.log(`Successfully moved https://trello.com/c/${shortLink}/ on ${destinationList}`))
  .catch(err => console.log(err));
}

function moveCards({res, cards, state, branch, query, key, token}) {
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
    moveCard({res, shortLink, destinationList, key, token});
  });
}

module.exports = {
  attachPRTocards,
  moveCards,
  attachCommitsToCards
}