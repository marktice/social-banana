const express = require('express');
const axios = require('axios');

const { User } = require('./../models/User');

// Middleware
const { authenticate } = require('./../middleware/authenticate');
const {
  validateCallback
} = require('./../middleware/linkedIn/validateCallback');
const { getAccessToken } = require('./../middleware/linkedIn/getAccessToken');

const {
  updateUserToggle
} = require('./../middleware/linkedIn/updateUserToggle');
const { validateListing } = require('./../middleware/linkedIn/validateListing');

// LinkedIn Routes
const linkedInRouter = express.Router();

linkedInRouter.get('/authURL', authenticate, (req, res) => {
  const userId = req.user._id;

  try {
    const {
      LINKEDIN_CLIENT_ID,
      LINKEDIN_REDIRECT_URI,
      LINKEDIN_STATE
    } = process.env;
    const redirect_uri = LINKEDIN_REDIRECT_URI + `%3FuserId%3D${userId}`;
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${redirect_uri}&state=${LINKEDIN_STATE}`;
    res.status(200).send({ url });
  } catch (error) {
    console.error(error.message);
    res.status(400).send({ error: error.message });
  }
});

linkedInRouter.get(
  '/callback',
  validateCallback,
  getAccessToken,
  async (req, res) => {
    const { user, accessToken } = req;

    try {
      // TODO: bcrypt accessToken (PRE SAVE!! :O)
      user.linkedIn.accessToken = accessToken;
      await user.save();
      res.redirect('/settings?linkedIn_connected=true');
    } catch (error) {
      console.error(error.message);
      res.redirect(
        `/settings?linkedIn_connected=false&error_message=${error.message}`
      );
    }
  }
);

linkedInRouter.post(
  '/share',
  authenticate,
  updateUserToggle,
  validateListing,
  async (req, res) => {
    const { accessToken, shareBody } = req;

    try {
      const response = await axios({
        method: 'POST',
        url: 'https://api.linkedin.com/v1/people/~/shares?format=json',
        headers: {
          'Content-Type': 'application/json',
          'x-li-format': 'json',
          Authorization: `Bearer ${accessToken}`
        },
        data: shareBody
      });
      const { updateUrl } = response.data;

      res.status(201).send({ updateUrl });
    } catch (error) {
      console.error(error.message);
      res.status(400).send({ error: error.message });
    }
  }
);

linkedInRouter.delete('/disconnect', authenticate, (req, res) => {
  const { user } = req;

  try {
    user.linkedIn.accessToken = null;
    user.save();
    res.status(200).send();
  } catch (error) {
    console.error(error.message);
    res.status(400).send({ error: error.message });
  }
});

module.exports = { linkedInRouter };
