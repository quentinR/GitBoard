function extractCardShortLinks({string}) {
  // Trello URL are type of https://trello.com/b/[SHORT_LINK]]/[CARD_NAME]
  const trelloBaseUrl = 'https://trello.com/';

  if (string.includes(trelloBaseUrl)) {

      const startIndex = string.indexOf(trelloBaseUrl) + trelloBaseUrl.length + 'b/'.length;
      var endIndex = startIndex + 1;
      while (endIndex < string.length && string.substring(endIndex, endIndex + 1) != '/') {
          var endIndex = endIndex + 1;
      }

      return { shortLink: string.substring(startIndex, endIndex),
               tail: string.substring(endIndex, string.length-1) };
  }
}

function findCardsShortLinks({message}) {
  let shortLinks = [];
  let tail = message;
  
  while (tail !== undefined) {
    const result = extractCardShortLinks({string: tail});
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

module.exports = {
  findCardsShortLinks
}