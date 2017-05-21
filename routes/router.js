// Routes
const index = require('./index');
const bitbucket = require('./bitbucket');

module.exports = (app) => {
  app.use('/', index);
  app.use('/bitbucket', bitbucket);
};