const express = require('express');
const router = express.Router();
const {processBitbucketHook} = require('../controllers/bitbucket')

/* GET Bitbucket home page. */
router.get('/', (req, res, next) => {
  res.render('bitbucket');
});

/* POST Bitbucket commit. */
router.post('/', processBitbucketHook);

module.exports = router;