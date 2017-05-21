const express = require('express');
const router = express.Router();
const bitbucketController = require('../controllers/bitbucket')

/* GET Bitbucket home page. */
router.get('/', function(req, res, next) {
  res.render('bitbucket');
});

/* POST Bitbucket commit. */
router.post('/', bitbucketController.postCommits);

module.exports = router;