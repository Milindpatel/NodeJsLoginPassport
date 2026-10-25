const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');
const config = require('./config');
const { createApp } = require('./app');

mongoose
  .connect(config.database)
  .then(() => {
    // Keep sessions in MongoDB so logins survive restarts.
    const sessionStore = MongoStore.create({ client: mongoose.connection.getClient() });
    createApp(config, { sessionStore }).listen(config.port, () =>
      console.log(`Server started on http://localhost:${config.port}`),
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
