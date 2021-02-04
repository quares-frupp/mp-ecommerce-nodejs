var express = require('express');
var exphbs  = require('express-handlebars');
const mercadopago = require('mercadopago');
const bodyParser = require('body-parser');
const fs = require('fs')
const path = require('path');
var port = process.env.PORT || 3000

var app = express();

const BASE_URL = 'http://frupp-mp-commerce-nodejs.herokuapp.com/';

const testBuyer = {
    id: 471923173,
    email: 'test_user_63274575@testuser.com',
    password: 'qatest2417'
};

const testSeller = {
    collector_id: 469485398,
    publicKey: 'APP_USR-7eb0138a-189f-4bec-87d1-c0504ead5626',
    accessToken: 'APP_USR-6317427424180639-042414-47e969706991d3a442922b0702a0da44-469485398'
};

mercadopago.configure({
    access_token: testSeller.accessToken,
    integrator_id: 'dev_24c65fb163bf11ea96500242ac130004'
});

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static('assets'));
 
app.use('/assets', express.static(__dirname + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render('home');
});

app.get('/detail', function (req, res) {
    res.render('detail', req.query);
});

app.post('/checkout', (req, res) => {
   const { img, title, price, unit } = req.body;

   const preference = {
       items: [
           {
               id: 1234,
               title: title,
               description: "Dispositivo móvil de Tienda e-commerce",
               unit_price: Number.parseFloat(price),
               quantity: Number.parseInt(unit),
               picture_url: path.join(BASE_URL + img)
           }
       ],
       payer: {
           name: 'Lalo',
           surname: 'Landa',
           email: testBuyer.email,
           phone: {
               area_code: "11",
               number: 22223333
           },
           address: {
               zip_code: "1111",
               street_name: 'False',
               street_number: 123
           }
       },
       external_reference: "frupp@quaresitsolutions.com",
       payment_methods: {
           excluded_payment_methods: [{
               "id": "amex"
           }],
           excluded_payment_types: [{
               "id": "atm"
           }],
           installments: 6
       },
       back_urls: {
           success: BASE_URL + 'success',
           pending: BASE_URL + 'pending',
           failure: BASE_URL + 'failure'
       },
       notification_url: BASE_URL + 'notifications',
       auto_return: "approved"
   };

   mercadopago.preferences.create(preference).then(response => {
       console.log(response);

       const jsonFile = require('./preferences.json');

       jsonFile.messages.push({
           preference_id: response.body.id,
           preference: response,
       });

       fs.writeFileSync('./preferences.json', JSON.stringify(jsonFile));

       res.redirect(response.body.init_point);
   }).catch(err => res.render('home'));

});

app.get('/success', (req, res) => {
    res.render('success', req.query);
});

app.post('/success', (req, res) => {
    res.render('success', req.query);
});

app.post('/pending', (req, res) => {
    res.sendStatus(200);
});

app.post('/failure', (req, res) => {
    res.sendStatus(200);
});

app.get('/preferences', (req, res) => {
    const jsonFile = require('./preferences.json');
    res.send(jsonFile);
});

app.get('/notifications', (req, res) => {
    const jsonFile = require('./notifications.json');
    res.send(jsonFile);
});


app.post('/notifications', (req, res) => {
    const jsonFile = require('./notifications.json');

    jsonFile.messages.push(res.body);

    fs.writeFileSync('./preferences.json', JSON.stringify(jsonFile));

    res.sendStatus(200);
});


app.listen(port);
