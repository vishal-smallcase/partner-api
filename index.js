const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors')
const fs = require('fs');
const port = 5000
const bodyParser = require('body-parser');

const holdings = require('./holdings');
app.use(bodyParser.json());

app.use(cors());

const SECRET = "vishal_d586b890919244839d62f59bb7cf45c9";
const API_SECRET = "vishal_5aee39cc1d4f440c97114490739ba6db";

const API_URL = 'https://gatewayapi-dev.smallcase.com/gateway/vishal';

app.get('/', (req, res) => {
  // let obj = jwt.verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbWFsbGNhc2VBdXRoSWQiOiI2MGQwN2EwM2Q1OTZhYWIxNTUxMzZkODQiLCJpYXQiOjE2MjQyODQ0OTIsImV4cCI6MTYyNDI4ODA5Mn0.qSWRo5Llxq1Njr9xE2sgbK-8OeExJ3JUiim5euTNqxE', SECRET);
  res.send('working');
})


app.post('/create-token', (req, res) => {
  let token;
  let guest = true;
  if(req.body?.userId) {
    const {userId} = req.body;
    const users = require('./users.json');
    if(users[userId]) {
      token = jwt.sign({smallcaseAuthId: users[userId]}, SECRET);
      guest = false;
    } else token = jwt.sign({ guest: true }, SECRET);
  } else token = jwt.sign({ guest: true }, SECRET);
  res.send({token, guest, status: 200});
})

app.post('/add-user', (req, res) => {
  try {
    if(req.body?.token && req.body?.userId) {
      const {userId, token} = req.body;
      let users = require('./users.json');
      let obj = jwt.verify(token, SECRET);
      users[userId] = obj.smallcaseAuthId;
      fs.writeFileSync('users.json', JSON.stringify(users));
      res.send({success: true});
    } else res.send({success: false, message: 'Token or User Id missing'});
  } catch(e) {
    console.log(e);
    res.send({success: false, message: 'Token invalid or expired'});
  }
})

app.post('/fetch-user-token', (req, res) => {
  if(req.body?.userId) {
    const users = require('./users.json');
    if(users[req.body.userId]) {
      const token = jwt.sign({smallcaseAuthId: users[req.body.userId]}, SECRET);
      res.send({token, success: true});
    } else res.send({success: false});
  } else {
    res.send({success: false, message: 'User ID missing'});
  }
})

app.post('/create-tid', async (req, res) => {
  if(req.body?.token && req.body?.intent) {
    const {token, intent, securities} = req.body;
    try {
      const headers = { 'x-gateway-secret': API_SECRET, 'x-gateway-authtoken': token};
      let data = {intent};
      if(securities) data.orderConfig = {type: 'SECURITIES', securities}; 
      const apiRes = await axios.post(API_URL+'/transaction', data, {headers});
      if(apiRes.data?.data?.transactionId) {
        res.send({transactionId: apiRes.data.data.transactionId, status: 200});
      } else res.send({message: 'Could not get transactionid', status: 500});
    } catch(e) {
      console.log(e);
      res.send({message: 'Got an error', status: 500});
    }
  }
  else res.send({message: 'Token required', status: 400});
})

app.post('/holdings_import', (req, res) => {
  let holdings = require('./holdings.json');
  const {smallcaseAuthId, securities} = req.body;
  holdings[smallcaseAuthId] = securities;
  fs.writeFileSync('holdings.json', JSON.stringify(holdings));
  res.send({success: true})
})

app.post('/fetch_holdings', (req, res) => {
  if(req.body?.token) {
    const obj = jwt.verify(req.body.token, SECRET);
    const holdings = require('./holdings.json');
    if(holdings[obj.smallcaseAuthId]) {
      res.send({securities: holdings[obj.smallcaseAuthId].holdings});
    } else res.send({securities: []});
  } else res.send({success: false});
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

